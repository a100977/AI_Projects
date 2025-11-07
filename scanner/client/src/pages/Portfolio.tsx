import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { APP_TITLE } from "@/const";
import { ArrowLeft, Plus, Play, TrendingUp, Trash2, Loader2, Search, ExternalLink, BarChart3, Activity, ArrowUpRight, ArrowDownRight, ArrowUpDown, ArrowUp, ArrowDown, LogOut, Folder, FileText } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

type SortField = 'symbol' | 'name' | 'price' | 'score' | 'rating';
type SortDirection = 'asc' | 'desc';

export default function Portfolio() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/portfolio/:id");
  const [, setLocation] = useLocation();
  const portfolioId = params?.id || "";

  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [stockSymbol, setStockSymbol] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const { data: marketIndexes } = trpc.marketData.getIndexes.useQuery();
  const { data: marketNews } = trpc.marketData.getNews.useQuery();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const portfolio = portfolios?.find(p => p.id === portfolioId);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  const sortedStocks = useMemo(() => {
    if (!portfolio?.stocks) return [];
    
    const stocks = [...portfolio.stocks];
    
    stocks.sort((a, b) => {
      const aAnalysis = results?.find(r => r.stockId === a.id);
      const bAnalysis = results?.find(r => r.stockId === b.id);
      
      let comparison = 0;
      
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'score':
          comparison = (aAnalysis?.totalScore || 0) - (bAnalysis?.totalScore || 0);
          break;
        case 'rating':
          const ratings = ['PASS', 'WATCH', 'BUY', 'STRONG BUY'];
          const aRating = ratings.indexOf(aAnalysis?.recommendation || 'PASS');
          const bRating = ratings.indexOf(bAnalysis?.recommendation || 'PASS');
          comparison = aRating - bRating;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return stocks;
  }, [portfolio?.stocks, results, sortField, sortDirection]);

  useEffect(() => {
    if (sortedStocks.length > 0 && !selectedStockId) {
      setSelectedStockId(sortedStocks[0].id);
    }
  }, [sortedStocks, selectedStockId]);

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
      if (selectedStockId === stockId) {
        setSelectedStockId(null);
      }
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

  const handleLogout = () => {
    window.location.href = "/api/logout";
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

  const selectedStock = portfolio.stocks?.find(s => s.id === selectedStockId);
  const selectedAnalysis = results?.find(r => r.stockId === selectedStockId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {/* Header - Same as Dashboard and Reports */}
      <header className="border-b border-blue-900/50 backdrop-blur-sm bg-slate-950/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {APP_TITLE}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              <Folder className="w-4 h-4 mr-2" />
              Portfolios
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/reports")}>
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Portfolio Title Section */}
      <div className="border-b border-blue-900/30 bg-slate-900/30 sticky top-[73px] z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h2 className="text-2xl font-bold">{portfolio.name}</h2>
                <p className="text-sm text-slate-400">{portfolio.stocks?.length || 0} stocks</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                size="sm"
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
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[calc(100vh-120px)]">
          {/* Left Panel - Market Indexes & News */}
          <div className="lg:col-span-3 overflow-y-auto space-y-4 max-h-[500px] lg:max-h-none">
            {/* Market Indexes */}
            <Card className="bg-slate-900/50 border-blue-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Market Indexes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {marketIndexes && marketIndexes.length > 0 ? (
                  marketIndexes.map((index) => (
                    <a
                      key={index.symbol}
                      href={`https://www.marketwatch.com/investing/index/${index.symbol.replace('^', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{index.name}</div>
                          <div className="text-xs text-slate-400">{index.symbol}</div>
                          <div className="text-sm font-semibold text-white mt-1">
                            ${index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs flex items-center gap-1 ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {index.change >= 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent.toFixed(2)}%)
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                      </div>
                    </a>
                  ))
                ) : (
                  <>
                    <div className="p-2 rounded bg-slate-800/50">
                      <div className="text-sm font-semibold text-white">S&P 500</div>
                      <div className="text-xs text-slate-400">Loading...</div>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50">
                      <div className="text-sm font-semibold text-white">NASDAQ</div>
                      <div className="text-xs text-slate-400">Loading...</div>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50">
                      <div className="text-sm font-semibold text-white">Dow Jones</div>
                      <div className="text-xs text-slate-400">Loading...</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Market Resources */}
            <Card className="bg-slate-900/50 border-blue-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Market Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="https://www.investing.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors group text-sm"
                >
                  <span className="text-white">Investing.com</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                </a>
                <a
                  href="https://www.marketwatch.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors group text-sm"
                >
                  <span className="text-white">MarketWatch</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                </a>
                <a
                  href="https://finviz.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors group text-sm"
                >
                  <span className="text-white">FINVIZ</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                </a>
                <a
                  href="https://finance.yahoo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors group text-sm"
                >
                  <span className="text-white">Yahoo Finance</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                </a>
                <a
                  href="https://seekingalpha.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors group text-sm"
                >
                  <span className="text-white">Seeking Alpha</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                </a>
              </CardContent>
            </Card>

            {/* Market News */}
            <Card className="bg-slate-900/50 border-blue-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Market News</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {marketNews && marketNews.length > 0 ? (
                  marketNews.map((news, idx) => (
                    <a
                      key={idx}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 rounded hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white mb-1">{news.title}</div>
                          <div className="text-xs text-slate-400">{news.source}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-400 flex-shrink-0 mt-0.5" />
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Loading news...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Stock Table */}
          <div className="lg:col-span-6 overflow-y-auto max-h-[600px] lg:max-h-none">
            <Card className="bg-slate-900/50 border-blue-900/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Portfolio Stocks</CardTitle>
                <CardDescription>Click on a stock to view detailed analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {portfolio.stocks && portfolio.stocks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th 
                            className="text-left py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleSort('symbol')}
                          >
                            <div className="flex items-center gap-1">
                              Symbol
                              {sortField === 'symbol' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-left py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center gap-1">
                              Name
                              {sortField === 'name' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleSort('price')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Price
                              {sortField === 'price' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleSort('score')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Score
                              {sortField === 'score' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-center py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleSort('rating')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Rating
                              {sortField === 'rating' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </div>
                          </th>
                          <th className="text-center py-3 px-2 text-slate-400 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStocks.map((stock) => {
                          const analysis = results?.find(r => r.stockId === stock.id);
                          const isSelected = selectedStockId === stock.id;
                          return (
                            <tr
                              key={stock.id}
                              onClick={() => setSelectedStockId(stock.id)}
                              className={`border-b border-slate-800 cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'
                              }`}
                            >
                              <td className="py-3 px-2">
                                <div className="font-semibold text-white">{stock.symbol}</div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="text-slate-300 max-w-[200px] truncate">{stock.name}</div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                {stock.price ? (
                                  <span className="text-green-400 font-semibold">${stock.price.toFixed(2)}</span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {analysis?.totalScore !== undefined ? (
                                  <span className="text-blue-400 font-bold">{analysis.totalScore}</span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {analysis?.recommendation ? (
                                  <div className="flex items-center justify-center gap-2">
                                    {analysis.recommendation === 'STRONG BUY' && (
                                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    )}
                                    {analysis.recommendation === 'BUY' && (
                                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    )}
                                    {analysis.recommendation === 'WATCH' && (
                                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    )}
                                    {analysis.recommendation === 'PASS' && (
                                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                                    )}
                                    <Badge className={`${getRecommendationColor(analysis.recommendation)} text-xs`}>
                                      {analysis.recommendation}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs">No analysis</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStock(stock.id, stock.symbol);
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-950/20 h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 mb-4">No stocks in this portfolio yet.</p>
                    <Button
                      onClick={() => setIsAddStockDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Stock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Stock Details */}
          <div className="lg:col-span-3 overflow-y-auto space-y-4 max-h-[600px] lg:max-h-none">
            {selectedStock && selectedAnalysis ? (
              <>
                {/* Stock Header */}
                <Card className="bg-slate-900/50 border-blue-900/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedStock.symbol}</CardTitle>
                        <CardDescription className="text-sm mt-1">{selectedStock.name}</CardDescription>
                      </div>
                      <Badge className={getRecommendationColor(selectedAnalysis.recommendation || '')}>
                        {selectedAnalysis.recommendation}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-white">
                        ${selectedAnalysis.currentPrice?.toFixed(2)}
                      </span>
                      {selectedAnalysis.priceChange !== undefined && (
                        <span className={`text-sm flex items-center gap-1 ${
                          selectedAnalysis.priceChange > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {selectedAnalysis.priceChange > 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {Math.abs(selectedAnalysis.priceChange).toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="text-3xl font-bold text-blue-400 mb-1">
                      {selectedAnalysis.totalScore}
                    </div>
                    <div className="text-xs text-slate-400">Total Score</div>
                  </CardContent>
                </Card>

                {/* Technical Indicators */}
                <Card className="bg-slate-900/50 border-blue-900/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Technical Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">SMA Breakout</span>
                        <span className="text-xs text-white font-semibold">
                          {selectedAnalysis.scores?.sma || 0}/25
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full"
                          style={{ width: `${((selectedAnalysis.scores?.sma || 0) / 25) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">MACD</span>
                        <span className="text-xs text-white font-semibold">
                          {selectedAnalysis.scores?.macd || 0}/20
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-green-400 h-1.5 rounded-full"
                          style={{ width: `${((selectedAnalysis.scores?.macd || 0) / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">RSI</span>
                        <span className="text-xs text-white font-semibold">
                          {selectedAnalysis.scores?.rsi || 0}/20
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-purple-400 h-1.5 rounded-full"
                          style={{ width: `${((selectedAnalysis.scores?.rsi || 0) / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">Volume</span>
                        <span className="text-xs text-white font-semibold">
                          {selectedAnalysis.scores?.volume || 0}/15
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-yellow-400 h-1.5 rounded-full"
                          style={{ width: `${((selectedAnalysis.scores?.volume || 0) / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">52-Week High</span>
                        <span className="text-xs text-white font-semibold">
                          {selectedAnalysis.scores?.high || 0}/15
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-cyan-400 h-1.5 rounded-full"
                          style={{ width: `${((selectedAnalysis.scores?.high || 0) / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                {selectedAnalysis.alerts && selectedAnalysis.alerts.length > 0 && (
                  <Card className="bg-slate-900/50 border-blue-900/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedAnalysis.alerts.map((alert, idx) => (
                          <div key={idx} className="text-xs text-yellow-400 bg-yellow-950/20 p-2 rounded">
                            {alert}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Deep Analysis Button */}
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  onClick={() => {
                    window.open(`https://finance.yahoo.com/quote/${selectedStock.symbol}/chart`, '_blank');
                  }}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Live Charts
                </Button>
              </>
            ) : selectedStock ? (
              <Card className="bg-slate-900/50 border-blue-900/50">
                <CardHeader>
                  <CardTitle className="text-xl">{selectedStock.symbol}</CardTitle>
                  <CardDescription>{selectedStock.name}</CardDescription>
                </CardHeader>
                <CardContent className="py-8 text-center">
                  <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Analysis Available</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Run the screener to analyze this stock and get technical indicator scores, recommendations, and alerts.
                  </p>
                  <Button
                    onClick={handleRunScreener}
                    disabled={runScreenerMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {runScreenerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Screener...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Screener Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/50 border-blue-900/50">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">
                    Select a stock from the table to view detailed analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
