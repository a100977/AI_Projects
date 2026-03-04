import base64
import json
import tempfile
import re
import math
from typing import Optional, Dict, Any, List
import time
import logging

import PIL.Image
import PIL.ImageChops
from google import genai
from google.genai import types

from config import GOOGLE_API_KEY, NANO_BANANA_MODEL, LOG_AI_PROMPTS, AI_PROMPT_LOG_MAX_CHARS, USE_GEMINI_FOR_IMAGE
from image_annotator_pil import get_pil_annotator

logger = logging.getLogger(__name__)

class ImageAnnotator:
    """Image analysis + editing via Google Nano Banana (Gemini image model)."""

    ASPECT_CHOICES = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"]

    def __init__(self):
        self.api_key = GOOGLE_API_KEY
        self.model = NANO_BANANA_MODEL
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.ai_enabled = bool(self.api_key)
        if not self.ai_enabled:
            print("Warning: GOOGLE_API_KEY not set. Nano Banana image generation is disabled.")

    def _prompt_preview(self, prompt: str) -> str:
        prompt_text = (prompt or "").strip()
        if not prompt_text:
            return ""
        limit = max(200, int(AI_PROMPT_LOG_MAX_CHARS or 2000))
        if len(prompt_text) <= limit:
            return prompt_text
        return f"{prompt_text[:limit]}\n...[truncated {len(prompt_text) - limit} chars]"

    def _log_gemini_prompt(
        self,
        prompt_kind: str,
        prompt: str,
        image_path: Optional[str],
        use_4k: bool,
    ) -> None:
        if not LOG_AI_PROMPTS:
            return
        logger.info(
            "Nano Banana prompt kind=%s model=%s use_4k=%s image=%s chars=%s\n%s",
            prompt_kind,
            self.model,
            use_4k,
            image_path or "none",
            len(prompt or ""),
            self._prompt_preview(prompt),
        )

    def _build_json_prompt(self, payload: Dict[str, Any]) -> str:
        """Serialize Gemini instructions as JSON text."""
        return json.dumps(payload, ensure_ascii=False)

    def _closest_aspect_ratio(self, image_path: str) -> str:
        """Map source image ratio to the closest supported Gemini aspect ratio."""
        try:
            with PIL.Image.open(image_path) as img:
                width, height = img.size
            if not width or not height:
                return "4:3"
            source_ratio = width / float(height)
            best = "4:3"
            best_delta = float("inf")
            for choice in self.ASPECT_CHOICES:
                left, right = choice.split(":")
                ratio = float(left) / float(right)
                delta = abs(source_ratio - ratio)
                if delta < best_delta:
                    best_delta = delta
                    best = choice
            return best
        except Exception:
            return "4:3"

    def _build_generate_config(
        self,
        response_modalities: Optional[list] = None,
        image_path: Optional[str] = None,
        use_4k: bool = False,
    ):
        kwargs: Dict[str, Any] = {}
        if response_modalities:
            kwargs["response_modalities"] = response_modalities
        if image_path:
            kwargs["image_config"] = types.ImageConfig(
                aspect_ratio=self._closest_aspect_ratio(image_path),
                image_size="4K" if use_4k else "2K",
            )
        if not kwargs:
            return None
        return types.GenerateContentConfig(**kwargs)

    def _call_gemini(
        self,
        prompt: str,
        image_path: Optional[str] = None,
        response_modalities: Optional[list] = None,
        use_4k: bool = False,
        prompt_kind: str = "generic",
    ):
        if not self.ai_enabled or not self.client:
            return None

        started = time.time()
        contents: List[Any] = [prompt]
        img_obj = None
        if image_path:
            img_obj = PIL.Image.open(image_path)
            contents.append(img_obj)

        config = self._build_generate_config(
            response_modalities=response_modalities,
            image_path=image_path,
            use_4k=use_4k,
        )

        try:
            self._log_gemini_prompt(prompt_kind, prompt, image_path, use_4k)
            logger.debug(
                "Gemini call start model=%s modalities=%s use_4k=%s image=%s",
                self.model, response_modalities, use_4k, image_path
            )
            return self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
        except Exception as e:
            print(f"Nano Banana request error: {e}")
            return None
        finally:
            logger.debug(
                "Gemini call finished in %ss model=%s",
                round(time.time() - started, 2), self.model
            )
            if img_obj is not None:
                try:
                    img_obj.close()
                except Exception:
                    pass

    def _extract_text(self, response) -> str:
        try:
            candidates = getattr(response, "candidates", None) or []
            if not candidates:
                return ""
            parts = getattr(candidates[0].content, "parts", None) or []
            text_chunks = [getattr(p, "text", "") for p in parts if getattr(p, "text", None)]
            return "\n".join([c for c in text_chunks if c]).strip()
        except Exception:
            return ""

    def _extract_image_bytes(self, response) -> Optional[bytes]:
        try:
            candidates = getattr(response, "candidates", None) or []
            if not candidates:
                logger.warning("_extract_image_bytes: no candidates in response")
                return None
            parts = getattr(candidates[0].content, "parts", None) or []
            for part in parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    data = inline.data
                    if isinstance(data, bytes):
                        logger.debug(f"_extract_image_bytes: extracted {len(data)} bytes from response")
                        return data
                    if isinstance(data, str):
                        try:
                            decoded = base64.b64decode(data)
                            logger.debug(f"_extract_image_bytes: decoded {len(decoded)} bytes from base64")
                            return decoded
                        except Exception as e:
                            logger.warning(f"_extract_image_bytes: base64 decode failed, returning encoded: {e}")
                            return data.encode("utf-8")
            logger.warning("_extract_image_bytes: no inline_data found in response parts")
            return None
        except Exception as e:
            logger.exception(f"_extract_image_bytes: exception: {e}")
            return None

    def _extract_json_object(self, text: str) -> str:
        cleaned = (text or "").strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return cleaned[start : end + 1]
        return cleaned

    def _save_generated_image(self, image_bytes: bytes) -> Optional[str]:
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            with open(temp_file.name, "wb") as f:
                f.write(image_bytes)
            logger.debug(f"_save_generated_image: saved {len(image_bytes)} bytes to {temp_file.name}")
            return temp_file.name
        except Exception as e:
            logger.exception(f"Error saving generated image: {e}")
            return None

    def _looks_like_regeneration(
        self,
        source_image_path: str,
        generated_image_path: str,
        rms_threshold: float = 40.0,
        unchanged_ratio_min: float = 0.55,
    ) -> bool:
        """
        Detect likely full-image regeneration instead of edit-overlay behavior.

        Returns True when generated image appears too different from source.
        """
        try:
            with PIL.Image.open(source_image_path).convert("RGB") as src_img, PIL.Image.open(generated_image_path).convert("RGB") as out_img:
                if out_img.size != src_img.size:
                    out_img = out_img.resize(src_img.size, PIL.Image.Resampling.LANCZOS)

                diff = PIL.ImageChops.difference(src_img, out_img)

                # RMS delta over RGB channels.
                hist = diff.histogram()
                sq = 0.0
                for idx, count in enumerate(hist):
                    value = idx % 256
                    sq += float(count) * (value * value)
                denom = float(src_img.size[0] * src_img.size[1] * 3)
                rms = math.sqrt(sq / max(1.0, denom))

                # Ratio of nearly unchanged pixels in grayscale diff.
                gray = diff.convert("L")
                gray_hist = gray.histogram()
                total = float(src_img.size[0] * src_img.size[1])
                unchanged = float(sum(gray_hist[:11])) / max(1.0, total)  # <=10 delta treated unchanged

                logger.info(
                    "Image integrity check rms=%.2f unchanged_ratio=%.3f src=%s out=%s",
                    rms, unchanged, source_image_path, generated_image_path
                )
                return (rms > rms_threshold) or (unchanged < unchanged_ratio_min)
        except Exception as e:
            logger.warning(f"_looks_like_regeneration failed, allowing image by default: {e}")
            return False

    def _save_if_edit_preserved(
        self,
        source_image_path: str,
        image_bytes: bytes,
        check_label: str,
    ) -> Optional[str]:
        """
        Save generated image only if it preserves source image structure (edit-like output).
        """
        out_path = self._save_generated_image(image_bytes)
        if not out_path:
            return None
        if self._looks_like_regeneration(source_image_path, out_path):
            logger.warning(
                "%s rejected: generated output appears to be regenerated, not edited. source=%s out=%s",
                check_label, source_image_path, out_path
            )
            try:
                import os
                os.remove(out_path)
            except Exception:
                pass
            return None
        return out_path

    def _extract_issue_items(self, text: str) -> List[str]:
        """
        Parse a single rejection text into individual issue items.
        Handles patterns like:
        - "1) ... 2) ..."
        - "1. ... 2. ..."
        - "issue A; issue B"
        """
        raw = " ".join((text or "").split()).strip()
        if not raw:
            return []

        # Strip generic lead-ins.
        raw = re.sub(
            r"^((multiple|one|two|three|\d+)\s+(issues|discrepancies)\s+(found|detected)\s*[:\-]\s*)",
            "",
            raw,
            flags=re.IGNORECASE,
        )

        # Prefer numbered issue extraction when available.
        numbered = re.split(r"\s*\b\d+\s*[\)\.:\-]\s*", raw)
        if len(numbered) > 2:
            items = [p.strip(" .;:-") for p in numbered if p.strip()]
            return items

        # Otherwise split by semicolon-like separators.
        parts = [p.strip(" .;:-") for p in re.split(r"\s*;\s*", raw) if p.strip()]
        if len(parts) >= 2:
            return parts

        return [raw]

    def analyze_result_item(
        self,
        artwork_path: str,
        result_item: Dict[str, Any],
        summary: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, str]:
        """
        Analyze a checklist result row and return JSON-like analysis for annotation.
        Works for both Rejected and Compliant rows.
        """
        summary_text = ""
        if summary:
            summary_text = (
                f"Summary: total={summary.get('total', 0)}, "
                f"compliant={summary.get('compliant', 0)}, "
                f"reject={summary.get('reject', 0)}, "
                f"na={summary.get('na', 0)}, "
                f"compliance_percentage={summary.get('compliance_percentage', 0)}"
            )

        prompt_payload = {
            "task": "prepare_compliance_annotation_instructions",
            "checklist_item": result_item.get("checklist_item", ""),
            "decision": result_item.get("decision", ""),
            "reference_info": result_item.get("reference_info", ""),
            "artwork_info": result_item.get("artwork_info", ""),
            "comments": result_item.get("comments", ""),
            "summary": summary_text,
            "output_schema": {
                "location": "precise area in image where annotation should point",
                "line_note": "single-line annotation text",
                "fix_instruction": "for reject rows, a precise instruction to fix the issue",
            },
            "output_requirements": {
                "format": "json_only",
                "no_extra_text": True,
            },
        }
        prompt = self._build_json_prompt(prompt_payload)

        response = self._call_gemini(
            prompt=prompt,
            image_path=artwork_path,
            response_modalities=["TEXT"],
            use_4k=False,
            prompt_kind="analyze_result_item",
        )
        if response:
            try:
                parsed = json.loads(self._extract_json_object(self._extract_text(response)))
                return {
                    "location": str(parsed.get("location", "unspecified area")),
                    "line_note": str(parsed.get("line_note", result_item.get("comments", "Compliance row"))),
                    "fix_instruction": str(parsed.get("fix_instruction", result_item.get("comments", result_item.get("checklist_item", "")))),
                }
            except Exception as e:
                print(f"Error parsing item analysis JSON: {e}")

        return {
            "location": "unspecified area",
            "line_note": str(result_item.get("comments", "Compliance row")),
            "fix_instruction": str(result_item.get("comments", result_item.get("checklist_item", ""))),
        }

    def generate_line_item_annotation_image(
        self,
        artwork_path: str,
        result_item: Dict[str, Any],
        analysis: Dict[str, str],
    ) -> Optional[str]:
        """
        Generate one annotation image for one checklist row (reject or compliant).
        """
        decision = str(result_item.get("decision", "")).strip().lower()
        if decision == "complaint":
            decision = "compliant"
        label = "REJECTED" if decision == "reject" else "APPROVED"
        color = "red" if decision == "reject" else "green"
        location = analysis.get("location", "unspecified area")
        note = analysis.get("line_note", result_item.get("comments", "Compliance row"))

        prompt_payload = {
            "task": "edit_image_add_single_compliance_annotation",
            "status_label": label,
            "annotation_color": color,
            "target_location": location,
            "single_line_text": note,
            "rules": [
                "Keep all original design untouched (pixel-preserving except annotation overlays).",
                "Add only one callout line for this row.",
                "Use a small arrow/callout at the specified location.",
                "Do not add any unrelated edits.",
                "Do NOT regenerate or reimagine the artwork. Use the given image as immutable base.",
            ],
            "output_requirements": {
                "return_mode": "edited_image_only",
            },
        }
        prompt = self._build_json_prompt(prompt_payload)

        response = self._call_gemini(
            prompt=prompt,
            image_path=artwork_path,
            response_modalities=["IMAGE"],
            use_4k=False,
            prompt_kind="line_item_annotation",
        )
        if response:
            logger.debug("generate_line_item_annotation_image: received response from Gemini")
            image_bytes = self._extract_image_bytes(response)
            if image_bytes:
                logger.debug(f"generate_line_item_annotation_image: extracted {len(image_bytes)} bytes, saving to file")
                return self._save_if_edit_preserved(
                    source_image_path=artwork_path,
                    image_bytes=image_bytes,
                    check_label="generate_line_item_annotation_image",
                )
            else:
                logger.warning("generate_line_item_annotation_image: _extract_image_bytes returned None")
        else:
            logger.warning("generate_line_item_annotation_image: _call_gemini returned None")
        return None

    def generate_summary_annotation_image(
        self,
        artwork_path: str,
        results: List[Dict[str, Any]],
        summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Generate one combined image with all row annotations and summary indicators.
        """
        lines: List[str] = []
        for idx, row in enumerate(results or [], start=1):
            decision = str(row.get("decision", "")).strip().lower()
            if decision == "complaint":
                decision = "compliant"
            if decision not in {"reject", "compliant"}:
                continue
            symbol = "REJECTED" if decision == "reject" else "APPROVED"
            item = str(row.get("checklist_item", "")).strip()
            cmnt = str(row.get("comments", "")).strip()
            merged = (cmnt or item)[:140]
            lines.append(f"{idx}. {symbol}: {merged}")
            if len(lines) >= 15:
                break

        if not lines:
            lines = ["No explicit reject/compliant rows detected for annotation."]

        summary_line = ""
        if summary:
            summary_line = (
                f"Total={summary.get('total', 0)}, "
                f"Compliant={summary.get('compliant', 0)}, "
                f"Reject={summary.get('reject', 0)}, "
                f"N/A={summary.get('na', 0)}, "
                f"Compliance={summary.get('compliance_percentage', 0)}%"
            )

        prompt_payload = {
            "task": "edit_image_add_consolidated_compliance_annotations",
            "annotation_lines": lines,
            "summary_line": summary_line or "Compliance summary unavailable",
            "rules": [
                "Keep artwork content unchanged except annotations.",
                "Use red for rejected and green for approved callouts.",
                "Keep annotations readable and non-overlapping as much as possible.",
            ],
            "output_requirements": {
                "return_mode": "edited_image_only",
            },
        }
        prompt = self._build_json_prompt(prompt_payload)

        response = self._call_gemini(
            prompt=prompt,
            image_path=artwork_path,
            response_modalities=["IMAGE"],
            use_4k=True,
            prompt_kind="summary_annotation",
        )
        if response:
            logger.debug("generate_summary_annotation_image: received response from Gemini")
            image_bytes = self._extract_image_bytes(response)
            if image_bytes:
                logger.info(f"generate_summary_annotation_image: extracted {len(image_bytes)} bytes, saving to file")
                return self._save_generated_image(image_bytes)
            else:
                logger.warning("generate_summary_annotation_image: _extract_image_bytes returned None")
        else:
            logger.warning("generate_summary_annotation_image: _call_gemini returned None")
        return None

    def generate_fixed_image_4k(
        self,
        artwork_path: str,
        issue_to_fix: str,
        context: str = "",
    ) -> Optional[str]:
        """
        Generate a fresh corrected image at 4K.
        Strictly edit only the specified problem area with visible corrections highlighted.
        """
        prompt_payload = {
            "task": "edit_image_annotate_corrections_4k",
            "issue_to_fix": issue_to_fix,
            "context_and_reference": context,
            "critical_instructions": [
                "CRITICAL: You MUST use the provided image as your base. Do NOT regenerate, re-draw, or modify ANY part of the artwork.",
                "CRITICAL: Every single pixel of the original image must remain UNCHANGED except ONLY for annotation overlays.",
                "CRITICAL: Only add red circles and green callout boxes - nothing else. Do not modify colors, text, logos, or layout.",
                "Identify ALL the specific text errors mentioned in the context.",
                "Draw TIGHT RED CIRCLES around ONLY the incorrect text/characters (tight circles, not big blobs).",
                "Add a thin GREEN ARROW pointing to each circled error.",
                "Add a GREEN RECTANGULAR CALLOUT BOX next to each arrow showing the CORRECT text.",
                "Keep the callout text SHORT and specific (e.g., should be: rapeseed).",
                "Do NOT modify the actual artwork text - annotations ONLY.",
                "Do NOT alter any other areas - preserve 100% of logo, colors, layout, spacing, imagery, typography.",
                "Output in high quality 4K.",
                "CRITICAL: If you cannot annotate without modifying the base image, return the image UNCHANGED.",
                "CRITICAL: Do NOT regenerate or reimagine the artwork. This is an EDIT ONLY operation, not image generation.",
            ],
            "example": {
                "incorrect": "rapeseed oil",
                "expected": "rapeseed",
                "annotation": "circle oil, add thin arrow, show box 'should be: rapeseed'",
            },
            "output_requirements": {
                "return_mode": "edited_image_only",
                "constraint": "ONLY add red circles and green callout boxes to the provided image. Do not regenerate.",
            },
        }
        prompt = self._build_json_prompt(prompt_payload)

        response = self._call_gemini(
            prompt=prompt,
            image_path=artwork_path,
            response_modalities=["IMAGE"],
            use_4k=True,
            prompt_kind="fix_image_4k",
        )
        if response:
            logger.debug("generate_fixed_image_4k: received response from Gemini")
            image_bytes = self._extract_image_bytes(response)
            if image_bytes:
                logger.info(f"generate_fixed_image_4k: extracted {len(image_bytes)} bytes, saving to file")
                return self._save_if_edit_preserved(
                    source_image_path=artwork_path,
                    image_bytes=image_bytes,
                    check_label="generate_fixed_image_4k",
                )
            else:
                logger.warning("generate_fixed_image_4k: _extract_image_bytes returned None")
        else:
            logger.warning("generate_fixed_image_4k: _call_gemini returned None")
        return None

    def generate_annotation_image_4k(
        self,
        artwork_path: str,
        issue_to_annotate: str,
        context: str = "",
    ) -> Optional[str]:
        """
        Generate a 4K annotated image for one rejection without changing artwork content.
        """
        issue_items = self._extract_issue_items(issue_to_annotate)
        if not issue_items:
            issue_items = [issue_to_annotate.strip() or "Compliance issue"]
        issue_block = "\n".join([f"{i+1}. {item}" for i, item in enumerate(issue_items)])
        issue_count = len(issue_items)

        prompt_payload = {
            "task": "edit_image_annotate_rejections_4k",
            "issue_list": issue_items,
            "expected_annotation_count": issue_count,
            "additional_context": context,
            "strict_annotation_rules": [
                "CRITICAL: You MUST use the provided image as your IMMUTABLE base. Do NOT regenerate, re-draw, or modify ANY part of the artwork.",
                "CRITICAL: Every single pixel of the original image must remain UNCHANGED except ONLY for annotation overlays.",
                "CRITICAL: Only add red circles and green callout boxes - nothing else. Do not touch colors, text, logos, or layout.",
                "Do NOT fix or rewrite artwork content - ANNOTATIONS ONLY.",
                "You MUST annotate every listed issue in this one image.",
                "Identify ONLY the specific error words/characters/tokens for each issue.",
                "Draw tight SMALL red circles around each exact incorrect token (not entire lines/paragraphs/ingredient list).",
                "For each red circle, add a thin red arrow and a short one-line label describing that specific issue.",
                "Render each label text in red and place it inside a clear red rectangular callout box (light fill, red border).",
                "Place each red callout box just below or sideways near the arrow target for readability.",
                "Do NOT merge multiple issues into one large circle.",
                "Keep all original text, logo, color, layout, spacing, imagery, and typography UNCHANGED (100%).",
                "Output in high quality 4K.",
                "CRITICAL: Do NOT regenerate or reimagine the artwork. This is an EDIT ONLY operation.",
                "CRITICAL: If you cannot annotate without regenerating, return the image UNCHANGED.",
            ],
            "important_notes": [
                "Do NOT draw one big circle around the whole ingredients block.",
                "Focus on pinpoint mistakes only (for example: a misspelled word or incorrect punctuation token).",
                "If a listed issue is not visually locatable, add a small red callout label near the most relevant region and mention visibility is limited.",
                "NEVER regenerate any part of the image. Only overlay annotations on top of the provided image.",
            ],
            "output_requirements": {
                "return_mode": "edited_image_only",
                "constraint": "ONLY add red circles and green callout boxes. Do not regenerate, re-draw, or modify the base image in any way.",
            },
        }
        prompt = self._build_json_prompt(prompt_payload)

        response = self._call_gemini(
            prompt=prompt,
            image_path=artwork_path,
            response_modalities=["IMAGE"],
            use_4k=True,
            prompt_kind="annotation_image_4k",
        )
        if response:
            logger.debug("generate_annotation_image_4k: received response from Gemini")
            image_bytes = self._extract_image_bytes(response)
            if image_bytes:
                logger.info(f"generate_annotation_image_4k: extracted {len(image_bytes)} bytes, saving to file")
                return self._save_if_edit_preserved(
                    source_image_path=artwork_path,
                    image_bytes=image_bytes,
                    check_label="generate_annotation_image_4k",
                )
            else:
                logger.warning("generate_annotation_image_4k: _extract_image_bytes returned None")
        else:
            logger.warning("generate_annotation_image_4k: _call_gemini returned None")
        return None

    def composite_all_row_annotations(
        self,
        annotated_image_paths: List[str],
        output_path: Optional[str] = None,
    ) -> Optional[str]:
        """
        Composite multiple row-level annotated images into one final image.
        Overlays all annotations on top of each other to show all rejections in one file.

        Args:
            annotated_image_paths: List of paths to individual row-annotated images
            output_path: Optional path to save the composite. If None, uses temp file.

        Returns:
            Path to the composite image file, or None if failed.
        """
        if not annotated_image_paths or len(annotated_image_paths) == 0:
            print("No annotated images provided to composite.")
            return None

        try:
            # Load the first image as the base
            base_image = PIL.Image.open(annotated_image_paths[0]).convert("RGBA")

            # Overlay all subsequent images on top
            for annotation_path in annotated_image_paths[1:]:
                try:
                    overlay_image = PIL.Image.open(annotation_path).convert("RGBA")

                    # Ensure overlay is same size as base
                    if overlay_image.size != base_image.size:
                        overlay_image = overlay_image.resize(base_image.size, PIL.Image.Resampling.LANCZOS)

                    # Composite: overlay transparent image on top of base
                    base_image = PIL.Image.alpha_composite(base_image, overlay_image)
                    overlay_image.close()
                except Exception as e:
                    print(f"Warning: Failed to overlay {annotation_path}: {e}")
                    continue

            # Convert back to RGB for saving as PNG/JPEG
            final_image = base_image.convert("RGB")

            # Save to output path or temp file
            if output_path:
                final_image.save(output_path)
                result_path = output_path
            else:
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                final_image.save(temp_file.name)
                result_path = temp_file.name

            final_image.close()
            base_image.close()

            return result_path

        except Exception as e:
            print(f"Error compositing annotation images: {e}")
            return None

    # Backward-compatible wrappers
    def analyze_rejection(
        self,
        artwork_path: str,
        checklist_item: str,
        comments: str,
    ) -> Optional[Dict[str, str]]:
        result_item = {
            "checklist_item": checklist_item,
            "decision": "Reject",
            "reference_info": "",
            "artwork_info": "",
            "comments": comments,
        }
        analysis = self.analyze_result_item(artwork_path, result_item)
        return {
            "problem_areas": analysis.get("line_note", comments or "Compliance issue"),
            "location": analysis.get("location", "unspecified area"),
            "suggestion": analysis.get("fix_instruction", f"Fix artwork for: {checklist_item}"),
        }

    def generate_annotated_image(
        self,
        artwork_path: str,
        problem_description: str,
        location: str,
    ) -> Optional[str]:
        result_item = {
            "checklist_item": problem_description,
            "decision": "Reject",
            "comments": problem_description,
        }
        analysis = {"location": location or "unspecified area", "line_note": problem_description, "fix_instruction": problem_description}
        return self.generate_line_item_annotation_image(artwork_path, result_item, analysis)

    def generate_correction_visualization(
        self,
        artwork_path: str,
        checklist_item: str,
        suggestion: str,
    ) -> Optional[str]:
        return self.generate_fixed_image_4k(
            artwork_path=artwork_path,
            issue_to_fix=suggestion or checklist_item,
            context=f"Checklist requirement: {checklist_item}",
        )

    # ─────────────────────────────────────────────────────────────────────
    # ROUTER METHODS: Choose between Gemini and PIL based on USE_GEMINI_FOR_IMAGE flag
    # ─────────────────────────────────────────────────────────────────────

    def annotate_rejection_image(
        self,
        artwork_path: str,
        issue_to_annotate: str,
        context: str = "",
    ) -> Optional[str]:
        """
        Router method: Generate rejection annotation using Gemini or PIL.
        Flag: USE_GEMINI_FOR_IMAGE (1=Gemini, 0=PIL)
        """
        if USE_GEMINI_FOR_IMAGE:
            logger.info("annotate_rejection_image: Using GEMINI")
            return self.generate_annotation_image_4k(
                artwork_path=artwork_path,
                issue_to_annotate=issue_to_annotate,
                context=context,
            )
        else:
            logger.info("annotate_rejection_image: Using PIL (local)")
            pil_annotator = get_pil_annotator()
            return pil_annotator.generate_annotation_image_pil(
                artwork_path=artwork_path,
                issue_to_annotate=issue_to_annotate,
                context=context,
            )

    def annotate_correction_image(
        self,
        artwork_path: str,
        issue_to_fix: str,
        context: str = "",
    ) -> Optional[str]:
        """
        Router method: Generate correction annotation using Gemini or PIL.
        Flag: USE_GEMINI_FOR_IMAGE (1=Gemini, 0=PIL)
        """
        if USE_GEMINI_FOR_IMAGE:
            logger.info("annotate_correction_image: Using GEMINI")
            return self.generate_fixed_image_4k(
                artwork_path=artwork_path,
                issue_to_fix=issue_to_fix,
                context=context,
            )
        else:
            logger.info("annotate_correction_image: Using PIL (local)")
            pil_annotator = get_pil_annotator()
            return pil_annotator.generate_fixed_image_pil(
                artwork_path=artwork_path,
                issue_to_fix=issue_to_fix,
                context=context,
            )
