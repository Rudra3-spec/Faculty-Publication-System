import { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Publication } from "@shared/schema";

interface ImpactData {
  year: number;
  publications: number;
  citations: number;
}

interface ImpactVisualizationProps {
  publications: Publication[];
}

export default function ImpactVisualization({ publications }: ImpactVisualizationProps) {
  const [data, setData] = useState<ImpactData[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Process publications data
    const yearMap = new Map<number, ImpactData>();
    
    // Initialize data for all years
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 9; year <= currentYear; year++) {
      yearMap.set(year, { year, publications: 0, citations: 0 });
    }

    // Count publications and citations by year
    publications.forEach(pub => {
      if (yearMap.has(pub.year)) {
        const yearData = yearMap.get(pub.year)!;
        yearData.publications++;
        yearData.citations += pub.citations || 0;
      }
    });

    // Convert to array and sort by year
    const sortedData = Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year);

    // Animate data loading
    const animateData = async () => {
      for (let i = 0; i <= sortedData.length; i++) {
        setData(sortedData.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setIsAnimating(false);
    };

    animateData();
  }, [publications]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Research Impact Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="year"
              tickFormatter={(year) => year.toString()}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) => [value, name === 'publications' ? 'Publications' : 'Citations']}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="publications"
              name="Publications"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.2}
              isAnimationActive={isAnimating}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="citations"
              name="Citations"
              stroke="#16a34a"
              fill="#22c55e"
              fillOpacity={0.2}
              isAnimationActive={isAnimating}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
