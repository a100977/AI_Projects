
CricAI Website Mirror Helper
============================

This bundle contains a one–liner `mirror_site.sh` script plus a README.

• **Purpose** – Download a *fully‑self‑contained* static copy of  
  https://cricanalysis.b12sites.com/ so that it can be hosted anywhere
  (GitHub Pages, Netlify, S3, Cloudflare Pages, etc.).

• **What the script does**  
  It runs GNU Wget with the right flags to:
    – crawl every page under the domain  
    – download all CSS, JavaScript, fonts, and images  
    – rewrite links to point to the local copies  
    – save files with proper extensions

• **Usage**

    ```bash
    chmod +x mirror_site.sh
    ./mirror_site.sh
    ```

  The mirror is placed in `cricanalysis.b12sites.com/` right next to the script.
  Test locally:

    ```bash
    cd cricanalysis.b12sites.com
    python3 -m http.server 9000
    # then open http://localhost:9000
    ```

  When satisfied, push the folder to your static‑hosting platform of choice.

• **Dependencies**  
  Wget (comes pre‑installed on most Linux/macOS; on Windows, install
  [GNU Win32 wget](https://eternallybored.org/misc/wget/) or use WSL).

— Generated 2025-05-01 01:16 
