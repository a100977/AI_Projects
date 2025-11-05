import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { APP_TITLE } from "@/const";
import { ArrowLeft, Plus, Play, TrendingUp, Trash2, Loader2, Search, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Portfolio() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/portfolio/:id");
  const [, setLocation] = useLocation();
  const portfolioId = params?.id || "";

  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [stockSymbol, setStockSymbol] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: portfolios } = trpc.portfolios.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: results, isLoading: resultsLoading, refetch: refetchResults } = trpc.screener.getResults.useQuery(
    { portfolioId },
    { enabled: isAuthenticated && !!portfolioId }
  );

  const addStockMutation = trpc.portfolios.addStock.useMutation();
  const removeStockMutation = trpc.portfolios.removeStock.useMutation();
  const runScreenerMutation = trpc.screener.runScreener.useMutation();
  const { data: searchResults } = trpc.screener.searchStocks.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const portfolio = portfolios?.find(p => p.id === portfolioId);

  const handleAddStock = async () => {
    const symbol = stockSymbol.trim().toUpperCase();
    if (!symbol) {
      toast.error("Please enter a stock symbol");
      return;
    }

    try {
      await addStockMutation.mutateAsync({
        portfolioId,
        symbol,
      });
      toast.success(`${symbol} added to portfolio`);
      setIsAddStockDialogOpen(false);
      setStockSymbol("");
      setSearchQuery("");
      // Refetch portfolios to update the list
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to add stock");
    }
  };

  const handleRemoveStock = async (stockId: string, symbol: string) => {
    try {
      await removeStockMutation.mutateAsync({
        portfolioId,
        stockId,
      });
      toast.success(`${symbol} removed from portfolio`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove stock");
    }
  };

  const handleRunScreener = async () => {
    try {
      await runScreenerMutation.mutateAsync({ portfolioId });
      toast.success("Screener completed successfully!");
      refetchResults();
    } catch (error: any) {
      toast.error(error.message || "Failed to run screener");
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'STRONG BUY': return 'bg-green-600';
      case 'BUY': return 'bg-blue-600';
      case 'WATCH': return 'bg-yellow-600';
      case 'PASS': return 'bg-slate-600';
      default: return 'bg-slate-600';
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Portfolio Not Found</h2>
          <Button onClick={() => setLocation("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-blue-900/50 backdrop-blur-sm bg-slate-950/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Portfolio Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{portfolio.name}</h2>
          {portfolio.notes && <p className="text-slate-400">{portfolio.notes}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-blue-900/50">
              <DialogHeader>
                <DialogTitle className="text-white">Add Stock to Portfolio</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter a stock ticker symbol (e.g., AAPL, MSFT, GOOGL)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search" className="text-white">Search Stock</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by symbol or name..."
                      className="bg-slate-800 border-slate-700 text-white pl-10"
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="mt-2 bg-slate-800 border border-slate-700 rounded-md max-h-48 overflow-y-auto">
                      {searchResults.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                          onClick={() => {
                            setStockSymbol(stock.symbol);
                            setSearchQuery("");
                          }}
                        >
                          <div className="font-semibold text-white">{stock.symbol}</div>
                          <div className="text-sm text-slate-400">{stock.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="symbol" className="text-white">Stock Symbol</Label>
                  <Input
                    id="symbol"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddStock}
                  disabled={addStockMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addStockMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Stock"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleRunScreener}
            disabled={runScreenerMutation.isPending || !portfolio.stocks || portfolio.stocks.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {runScreenerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Screener
              </>
            )}
          </Button>
        </div>

        {/* Stocks List */}
        {portfolio.stocks && portfolio.stocks.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Stocks ({portfolio.stocks.length})</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.stocks.map((stock) => (
                <Card key={stock.id} className="bg-slate-900/50 border-blue-900/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{stock.symbol}</CardTitle>
                        <CardDescription className="text-slate-400 text-sm">
                          {stock.name}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStock(stock.id, stock.symbol)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {stock.price && (
                    <CardContent>
                      <div className="text-lg font-semibold text-green-400">
                        ${stock.price.toFixed(2)}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-slate-900/50 border-blue-900/50 mb-8">
            <CardContent className="py-12 text-center">
              <p className="text-slate-400 mb-4">No stocks in this portfolio yet.</p>
              <Button
                onClick={() => setIsAddStockDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Stock
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Screener Results */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Screener Results</h3>
          {resultsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-4">
              {results
                .filter(r => r.hasAnalysis)
                .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                .map((result) => (
                  <Card key={result.stockId} className="bg-slate-900/50 border-blue-900/50">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white flex items-center gap-3">
                            {result.symbol}
                            <Badge className={getRecommendationColor(result.recommendation || '')}>
                              {result.recommendation}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-slate-400">{result.name}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-400">{result.totalScore}</div>
                          <div className="text-sm text-slate-400">Score</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-white mb-2">Price Info</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Current Price:</span>
                              <span className="text-white font-semibold">${result.currentPrice?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Change:</span>
                              <span className={result.priceChange && result.priceChange > 0 ? 'text-green-400' : 'text-red-400'}>
                                {result.priceChange?.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-2">Indicator Scores</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">SMA:</span>
                              <span className="text-white">{result.scores?.sma}/25</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">MACD:</span>
                              <span className="text-white">{result.scores?.macd}/20</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">RSI:</span>
                              <span className="text-white">{result.scores?.rsi}/20</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Volume:</span>
                              <span className="text-white">{result.scores?.volume}/15</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">High Breakout:</span>
                              <span className="text-white">{result.scores?.high}/15</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {result.alerts && result.alerts.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-white mb-2">Alerts</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.alerts.map((alert, idx) => (
                              <Badge key={idx} variant="outline" className="border-yellow-600 text-yellow-400">
                                {alert}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-blue-900/50">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400 mb-4">
                  No screener results yet. Add stocks and run the screener to see analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
