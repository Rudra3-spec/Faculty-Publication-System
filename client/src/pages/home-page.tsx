import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import PublicationList from "@/components/publication-list";
import SearchFilter from "@/components/search-filter";
import { Publication } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [searchParams, setSearchParams] = useState({
    query: "",
    type: "All Types",
    year: "All Years"
  });

  const { data: publications = [], isLoading } = useQuery<Publication[]>({
    queryKey: ["/api/publications/search", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams.query) params.append("query", searchParams.query);
      if (searchParams.type) params.append("type", searchParams.type);
      if (searchParams.year) params.append("year", searchParams.year);

      const response = await fetch(`/api/publications/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch publications');
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Publications Summary Generator</h1>
            <p className="text-muted-foreground">Welcome, {user?.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <SearchFilter 
            onSearch={(query) => setSearchParams(prev => ({ ...prev, query }))}
            onTypeFilter={(type) => setSearchParams(prev => ({ ...prev, type }))}
            onYearFilter={(year) => setSearchParams(prev => ({ ...prev, year }))}
            placeholder="Search publications by title, author, or keywords..."
          />
        </div>

        {/* Publications List */}
        <Card>
          <CardHeader>
            <CardTitle>All Publications</CardTitle>
            <CardDescription>
              Browse through all research work and contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicationList 
              publications={publications}
              isLoading={isLoading}
              showActions={!!user?.isAdmin}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}