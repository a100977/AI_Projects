import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  AlertCircle
} from "lucide-react";

interface StockRecommendation {
  symbol: string;
  name: string;
  score: number;
  price: number;
  change: number;
  changePercent: number;
  rsi: number;
  volumeRatio: number;
  recommendation: string;
  sector: string;
  // Indicator scores
  smaScore: number;
  macdScore: number;
  rsiScore: number;
  volumeScore: number;
  highScore: number;
  // Technical values
  sma10: number;
  sma50: number;
  sma200: number;
  macdLine: number;
  signalLine: number;
  high52w: number;
  alerts: string;
}

interface DailyReport {
  id: string;
  date: string;
  portfolioId: string;
  portfolioName: string;
  totalStocks: number;
  analyzedStocks: number;
  strongBuyCount: number;
  buyCount: number;
  recommendations: StockRecommendation[];
  sectorAnalysis: {
    sector: string;
    count: number;
    avgScore: number;
    topScore: number;
  }[];
}

export default function Reports() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation]);

  const { data: portfolios = [] } = trpc.portfolios.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: reports = [], isLoading: reportsLoading } = trpc.reports.getDailyReports.useQuery(
    { dateFilter: selectedDate },
    { enabled: isAuthenticated }
  );

  const generateReportMutation = trpc.reports.generateReport.useMutation();

  const handleGenerateReport = async () => {
    try {
      await generateReportMutation.mutateAsync();
      // Refetch reports after generation
      window.location.reload();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG BUY':
        return 'bg-green-600 text-white';
      case 'BUY':
        return 'bg-blue-600 text-white';
      case 'WATCH':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const generateBuyRationale = (stock: StockRecommendation): string => {
    const strengths: string[] = [];
    
    // Check which indicators are strongest
    if (stock.smaScore >= 15) {
      strengths.push('bullish SMA crossover');
    }
    if (stock.macdScore >= 12) {
      strengths.push('positive MACD momentum');
    }
    if (stock.rsiScore >= 12 && stock.rsi >= 50 && stock.rsi < 70) {
      strengths.push('optimal RSI momentum');
    }
    if (stock.volumeScore >= 10) {
      strengths.push(`${stock.volumeRatio.toFixed(1)}x volume surge`);
    }
    if (stock.highScore >= 10 && stock.high52w > 0) {
      const pctFrom52w = ((stock.price / stock.high52w) * 100).toFixed(0);
      strengths.push(`${pctFrom52w}% of 52-week high`);
    }
    
    // If no specific strengths, use generic strong signals
    if (strengths.length === 0) {
      strengths.push('strong technical signals');
    }
    
    // Create a natural language sentence
    const mainStrength = strengths.slice(0, 2).join(' and ');
    return `Showing ${mainStrength} with score ${stock.score}/100`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-blue-900/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Daily Portfolio Reports</h1>
                <p className="text-sm text-slate-400">Automated daily analysis at 6:00 AM PST</p>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isPending || portfolios.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generateReportMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Button
              variant={selectedDate === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate('today')}
              className={selectedDate === 'today' ? 'bg-blue-600' : ''}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Today
            </Button>
            <Button
              variant={selectedDate === 'yesterday' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate('yesterday')}
              className={selectedDate === 'yesterday' ? 'bg-blue-600' : ''}
            >
              Yesterday
            </Button>
            <Button
              variant={selectedDate === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate('week')}
              className={selectedDate === 'week' ? 'bg-blue-600' : ''}
            >
              Last 7 Days
            </Button>
            <Button
              variant={selectedDate === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate('month')}
              className={selectedDate === 'month' ? 'bg-blue-600' : ''}
            >
              Last 30 Days
            </Button>
          </div>
        </div>

        {/* Reports List */}
        {reportsLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-400">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="bg-slate-900/50 border-blue-900/50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No Reports Found</h3>
              <p className="text-sm text-slate-400 mb-4">
                Reports are automatically generated every morning at 6:00 AM PST. You can also generate one manually.
              </p>
              <Button onClick={handleGenerateReport} className="bg-blue-600 hover:bg-blue-700">
                Generate Report Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {reports.map((report: DailyReport) => (
              <Card key={report.id} className="bg-slate-900/50 border-blue-900/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-white">{report.portfolioName}</CardTitle>
                      <CardDescription className="text-slate-400">
                        Report Date: {new Date(report.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Executive Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800/50 border-blue-800/30">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-white">{report.totalStocks}</div>
                        <div className="text-xs text-slate-400">Total Stocks</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-blue-800/30">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-white">{report.analyzedStocks}</div>
                        <div className="text-xs text-slate-400">Analyzed</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-900/30 border-green-700/30">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-400">{report.strongBuyCount}</div>
                        <div className="text-xs text-slate-400">STRONG BUY</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-900/30 border-blue-700/30">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-400">{report.buyCount}</div>
                        <div className="text-xs text-slate-400">BUY</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Opportunities */}
                  {report.recommendations && report.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                        Top Opportunities (Score ≥ 70)
                      </h3>
                      
                      {/* Table Card */}
                      <Card className="bg-slate-800/40 border-blue-900/40 overflow-hidden">
                        <CardContent className="p-0">
                          {/* Table Header */}
                          <div className="bg-slate-800/60 border-b border-blue-900/50">
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                              <div className="col-span-1">#</div>
                              <div className="col-span-2">Symbol</div>
                              <div className="col-span-2">Company</div>
                              <div className="col-span-1 text-center">Score</div>
                              <div className="col-span-1 text-center">Rating</div>
                              <div className="col-span-5">Buy Rationale</div>
                            </div>
                          </div>
                          
                          {/* Table Body */}
                          <div className="divide-y divide-blue-900/30">
                            {report.recommendations.map((stock, idx) => (
                              <div
                                key={stock.symbol}
                                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors items-center"
                              >
                                {/* Rank */}
                                <div className="col-span-1">
                                  <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center">
                                    <span className="text-sm font-bold text-blue-300">#{idx + 1}</span>
                                  </div>
                                </div>
                                
                                {/* Symbol */}
                                <div className="col-span-2">
                                  <div className="font-bold text-white text-lg">{stock.symbol}</div>
                                  <div className={`text-xs flex items-center gap-1 mt-1 ${
                                    stock.changePercent > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {stock.changePercent > 0 ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    ${stock.price.toFixed(2)} ({stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                                  </div>
                                </div>
                                
                                {/* Company Name */}
                                <div className="col-span-2">
                                  <div className="text-sm text-slate-200">{stock.name}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">{stock.sector}</div>
                                </div>
                                
                                {/* Score */}
                                <div className="col-span-1 text-center">
                                  <div className="inline-flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                                    <div className="text-2xl font-bold text-blue-400">{stock.score}</div>
                                    <div className="text-xs text-slate-400">/ 100</div>
                                  </div>
                                </div>
                                
                                {/* Rating Badge */}
                                <div className="col-span-1 flex justify-center">
                                  <Badge className={`${getRecommendationColor(stock.recommendation)} px-3 py-1 text-xs font-semibold`}>
                                    {stock.recommendation}
                                  </Badge>
                                </div>
                                
                                {/* Buy Rationale */}
                                <div className="col-span-5">
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 text-green-400">
                                      <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm text-slate-300 leading-relaxed">
                                      {generateBuyRationale(stock)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Sector Analysis */}
                  {report.sectorAnalysis && report.sectorAnalysis.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Sector Strength Distribution</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {report.sectorAnalysis.map((sector) => (
                          <Card key={sector.sector} className="bg-slate-800/30 border-blue-800/20">
                            <CardContent className="p-4">
                              <div className="font-semibold text-white mb-2">{sector.sector}</div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">{sector.count} stocks</span>
                                <span className="text-blue-400 font-semibold">Avg: {sector.avgScore.toFixed(0)}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Top Score: {sector.topScore}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
