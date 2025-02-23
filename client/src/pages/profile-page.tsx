import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, FileText, Download, Edit, Book, BookOpen, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, UpdateUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PublicationForm from "@/components/publication-form";
import PublicationList from "@/components/publication-list";
import { Publication } from "@shared/schema";
import { Link } from "wouter";
import ImpactVisualization from "@/components/impact-visualization";

type SummaryFormat = "PDF" | "Word" | "Web";
type SummaryFilter = "year" | "type" | "area";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>("PDF");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("year");

  const form = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user?.name,
      department: user?.department,
      designation: user?.designation,
      bio: user?.bio || "",
      researchInterests: user?.researchInterests || "",
      contactEmail: user?.contactEmail || "",
    },
  });

  // Update the publications query
  const { data: publications = [], isLoading } = useQuery<Publication[]>({
    queryKey: ["/api/publications/user", user?.id],
    enabled: !!user?.id, // Only run query when user ID is available
  });

  // Calculate statistics
  const totalPublications = publications.length;
  const totalCitations = publications.reduce((sum, pub) => sum + (pub.citations || 0), 0);
  const researchAreas = [...new Set(publications.map(pub => pub.researchArea || 'Uncategorized'))];

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUser) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated successfully" });
      setIsEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateSummary = async () => {
    window.open(
      `/api/publications/summary?format=${summaryFormat.toLowerCase()}&filter=${summaryFilter}`,
      '_blank'
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Information */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">{user?.name}</CardTitle>
                  <CardDescription>
                    {user?.designation} at {user?.department}
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={() => setIsEditMode(!isEditMode)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Designation</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="researchInterests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Research Interests</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditMode(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    {user?.bio && (
                      <div>
                        <h3 className="font-semibold mb-2">About</h3>
                        <p className="text-muted-foreground">{user.bio}</p>
                      </div>
                    )}
                    {user?.researchInterests && (
                      <div>
                        <h3 className="font-semibold mb-2">Research Interests</h3>
                        <p className="text-muted-foreground">{user.researchInterests}</p>
                      </div>
                    )}
                    {user?.contactEmail && (
                      <div>
                        <h3 className="font-semibold mb-2">Contact</h3>
                        <p className="text-muted-foreground">{user.contactEmail}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Generation */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Summary</CardTitle>
                <CardDescription>
                  Export your publications in various formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Format</h3>
                  <Select
                    value={summaryFormat}
                    onValueChange={(value) => setSummaryFormat(value as SummaryFormat)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF Document</SelectItem>
                      <SelectItem value="Word">Word Document</SelectItem>
                      <SelectItem value="Web">Web Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Group By</h3>
                  <Select
                    value={summaryFilter}
                    onValueChange={(value) => setSummaryFilter(value as SummaryFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Publication Year</SelectItem>
                      <SelectItem value="type">Publication Type</SelectItem>
                      <SelectItem value="area">Research Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerateSummary}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Publications
              </CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPublications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Citations
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCitations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Research Areas
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{researchAreas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Latest Update
              </CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {publications[0]?.updatedAt ? new Date(publications[0].updatedAt).toLocaleDateString() : 'No publications'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Impact Visualization */}
        <div className="mt-8">
          <ImpactVisualization publications={publications} />
        </div>

        <div className="flex justify-between items-center mb-6 mt-8">
          <h2 className="text-xl font-semibold">Publications</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Publication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Publication</DialogTitle>
              </DialogHeader>
              <PublicationForm onSuccess={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <PublicationList
          publications={publications}
          isLoading={isLoading}
          showActions={true}
        />
      </main>
    </div>
  );
}