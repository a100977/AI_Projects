import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Plus, TrendingUp, Folder, LogOut, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolioNotes, setPortfolioNotes] = useState("");

  const { data: portfolios, isLoading, refetch } = trpc.portfolios.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const syncUserMutation = trpc.auth.syncUser.useMutation();
  const createPortfolioMutation = trpc.portfolios.create.useMutation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (isAuthenticated && user) {
      syncUserMutation.mutate();
    }
  }, [isAuthenticated, user]);

  const handleCreatePortfolio = async () => {
    if (!portfolioName.trim()) {
      toast.error("Please enter a portfolio name");
      return;
    }

    try {
      await createPortfolioMutation.mutateAsync({
        name: portfolioName,
        notes: portfolioNotes,
      });
      toast.success("Portfolio created successfully!");
      setIsCreateDialogOpen(false);
      setPortfolioName("");
      setPortfolioNotes("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create portfolio");
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || 'there'}!</h2>
          <p className="text-slate-400">Manage your portfolios and discover bullish breakout opportunities.</p>
        </div>

        {/* Create Portfolio Button */}
        <div className="mb-6">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-blue-900/50">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Portfolio</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a portfolio to track and analyze your stocks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">Portfolio Name</Label>
                  <Input
                    id="name"
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    placeholder="e.g., Tech Growth Stocks"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-white">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={portfolioNotes}
                    onChange={(e) => setPortfolioNotes(e.target.value)}
                    placeholder="Add any notes about this portfolio..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreatePortfolio}
                  disabled={createPortfolioMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createPortfolioMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Portfolio"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolios Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : portfolios && portfolios.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <Card
                key={portfolio.id}
                className="bg-slate-900/50 border-blue-900/50 backdrop-blur cursor-pointer hover:border-blue-500/50 transition-colors"
                onClick={() => setLocation(`/portfolio/${portfolio.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Folder className="w-10 h-10 text-blue-400 mb-2" />
                    <div className="text-sm text-slate-400">
                      {portfolio.stockCount} stocks
                    </div>
                  </div>
                  <CardTitle className="text-white">{portfolio.name}</CardTitle>
                  {portfolio.notes && (
                    <CardDescription className="text-slate-400 line-clamp-2">
                      {portfolio.notes}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-500">
                    Created: {portfolio.dateAdded ? new Date(portfolio.dateAdded).toLocaleDateString() : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900/50 border-blue-900/50 backdrop-blur">
            <CardContent className="py-12 text-center">
              <Folder className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Portfolios Yet</h3>
              <p className="text-slate-400 mb-4">
                Create your first portfolio to start tracking stocks and running the screener.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Portfolio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
