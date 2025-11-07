import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { TrendingUp, BarChart3, Target, Zap, Shield, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const loginUrl = getLoginUrl();
  const isOAuthConfigured = loginUrl !== null;

  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="animate-pulse text-2xl text-blue-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-blue-900/50 backdrop-blur-sm bg-slate-950/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {APP_TITLE}
            </h1>
          </div>
          {isOAuthConfigured ? (
            <Button
              onClick={() => window.location.href = loginUrl!}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sign In with Google
            </Button>
          ) : (
            <Button
              disabled
              className="bg-slate-600 cursor-not-allowed"
            >
              Authentication Setup Required
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Discover Bullish Breakout Stocks
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Advanced technical analysis powered by 5 key indicators to identify high-momentum stocks ready for breakout.
          </p>
          <Button
            size="lg"
            onClick={() => isOAuthConfigured && loginUrl && (window.location.href = loginUrl)}
            disabled={!isOAuthConfigured}
            className={isOAuthConfigured 
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg px-8 py-6"
              : "bg-slate-600 cursor-not-allowed text-lg px-8 py-6"}
          >
            {isOAuthConfigured ? "Get Started Free" : "Authentication Setup Required"}
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Powerful Technical Analysis</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-blue-400 mb-4" />
              <CardTitle className="text-white">SMA Analysis</CardTitle>
              <CardDescription className="text-slate-400">
                Track 10, 50, and 200-day moving averages to identify golden crosses and trend strength.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardHeader>
              <Target className="w-12 h-12 text-cyan-400 mb-4" />
              <CardTitle className="text-white">MACD Signals</CardTitle>
              <CardDescription className="text-slate-400">
                Detect momentum shifts with MACD line crossovers and histogram analysis.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardHeader>
              <Zap className="w-12 h-12 text-yellow-400 mb-4" />
              <CardTitle className="text-white">RSI Momentum</CardTitle>
              <CardDescription className="text-slate-400">
                Identify oversold conditions and bullish momentum with RSI analysis.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-green-400 mb-4" />
              <CardTitle className="text-white">Volume Surge</CardTitle>
              <CardDescription className="text-slate-400">
                Detect unusual volume spikes that signal institutional interest.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardHeader>
              <Shield className="w-12 h-12 text-purple-400 mb-4" />
              <CardTitle className="text-white">52-Week High</CardTitle>
              <CardDescription className="text-slate-400">
                Track stocks breaking out to new highs with strong momentum.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardHeader>
              <Crown className="w-12 h-12 text-orange-400 mb-4" />
              <CardTitle className="text-white">Smart Scoring</CardTitle>
              <CardDescription className="text-slate-400">
                Aggregate score (0-100) combining all indicators for quick decisions.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Choose Your Plan</h3>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-slate-900/50 border-blue-900/50">
            <CardHeader>
              <CardTitle className="text-white">Free</CardTitle>
              <div className="text-3xl font-bold text-blue-400">$0</div>
              <CardDescription className="text-slate-400">Perfect to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-300">
                <li>✓ 1 Portfolio</li>
                <li>✓ 10 Stocks per portfolio</li>
                <li>✓ Daily screener results</li>
                <li>✓ Basic indicators</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-cyan-500/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 px-4 py-1 rounded-full text-sm font-bold">
              POPULAR
            </div>
            <CardHeader>
              <CardTitle className="text-white">Pro</CardTitle>
              <div className="text-3xl font-bold text-cyan-400">$29<span className="text-lg">/mo</span></div>
              <CardDescription className="text-slate-300">For serious traders</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-200">
                <li>✓ 5 Portfolios</li>
                <li>✓ 50 Stocks per portfolio</li>
                <li>✓ Advanced indicators</li>
                <li>✓ Export to CSV</li>
                <li>✓ Email alerts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-blue-900/50">
            <CardHeader>
              <CardTitle className="text-white">Premium</CardTitle>
              <div className="text-3xl font-bold text-orange-400">$99<span className="text-lg">/mo</span></div>
              <CardDescription className="text-slate-400">For professionals</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-300">
                <li>✓ Unlimited Portfolios</li>
                <li>✓ Unlimited Stocks</li>
                <li>✓ API Access</li>
                <li>✓ Custom alerts</li>
                <li>✓ Priority support</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-2xl p-12">
          <h3 className="text-4xl font-bold mb-4">Ready to Find Your Next Winner?</h3>
          <p className="text-xl text-slate-300 mb-8">
            Join traders using data-driven analysis to identify breakout opportunities.
          </p>
          <Button
            size="lg"
            onClick={() => isOAuthConfigured && loginUrl && (window.location.href = loginUrl)}
            disabled={!isOAuthConfigured}
            className={isOAuthConfigured 
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg px-8 py-6"
              : "bg-slate-600 cursor-not-allowed text-lg px-8 py-6"}
          >
            {isOAuthConfigured ? "Start Free Trial" : "Authentication Setup Required"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-900/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-slate-400">
          <p>&copy; 2025 {APP_TITLE}. Powered by AirTable & Manus.</p>
        </div>
      </footer>
    </div>
  );
}
