import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel } from "@/components/ui/resizable";
import { Users, BookOpen, Group, Settings } from "lucide-react";
import SearchFilter from "@/components/search-filter";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: publications = [], isLoading: isLoadingPublications } = useQuery({
    queryKey: ["/api/publications"],
  });

  const { data: researchGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["/api/research-groups"],
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, publications, and research groups
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="publications" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Publications
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Group className="h-4 w-4" />
            Research Groups
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchFilter 
                onSearch={(query: string) => console.log(query)} 
                placeholder="Search users..."
              />
              <div className="mt-4">
                {/* User management content will go here */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publications">
          <Card>
            <CardHeader>
              <CardTitle>Publication Management</CardTitle>
              <CardDescription>
                Review and moderate publications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchFilter 
                onSearch={(query: string) => console.log(query)} 
                onTypeFilter={(type: string) => console.log(type)}
                onYearFilter={(year: string) => console.log(year)}
                placeholder="Search publications..."
              />
              <div className="mt-4">
                {/* Publication management content will go here */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Research Group Management</CardTitle>
              <CardDescription>
                Oversee research groups and their activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchFilter 
                onSearch={(query: string) => console.log(query)} 
                placeholder="Search research groups..."
              />
              <div className="mt-4">
                {/* Research group management content will go here */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Settings content will go here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}