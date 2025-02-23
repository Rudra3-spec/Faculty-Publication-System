import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Publication } from "@shared/schema";

interface DashboardProps {
  publications: Publication[];
}

export default function ResearchImpactDashboard({ publications }: DashboardProps) {
  // Calculate yearly publication counts
  const yearlyData = publications.reduce((acc: Record<number, number>, pub) => {
    acc[pub.year] = (acc[pub.year] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(yearlyData)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  // Get top cited papers
  const topCitedPapers = [...publications]
    .sort((a, b) => (b.citations || 0) - (a.citations || 0))
    .slice(0, 3);

  // Calculate total citations
  const totalCitations = publications.reduce((sum, pub) => sum + (pub.citations || 0), 0);
  const avgCitationsPerPaper = totalCitations / publications.length || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Publication Trends</CardTitle>
          <CardDescription>Your research output over the years</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" name="Publications" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Citation Metrics</CardTitle>
          <CardDescription>Impact of your research</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-bold">{totalCitations}</p>
              <p className="text-sm text-muted-foreground">Total Citations</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{avgCitationsPerPaper.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Citations per Publication</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{publications.length}</p>
              <p className="text-sm text-muted-foreground">Total Publications</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most Cited Papers</CardTitle>
          <CardDescription>Your top impactful publications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCitedPapers.map((paper, index) => (
              <div key={paper.id} className="space-y-1">
                <div className="flex items-start justify-between">
                  <p className="font-medium line-clamp-1">{paper.title}</p>
                  <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                    {paper.citations} citations
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {paper.venue} ({paper.year})
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
