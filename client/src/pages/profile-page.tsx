import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, FileText, Download } from "lucide-react";
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
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PublicationForm from "@/components/publication-form";
import PublicationList from "@/components/publication-list";
import { Publication } from "@shared/schema";
import { Link } from "wouter";

type SummaryFormat = "PDF" | "Word" | "Web";
type SummaryFilter = "year" | "type" | "area";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>("PDF");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("year");

  const { data: publications = [], isLoading } = useQuery<Publication[]>({
    queryKey: ["/api/publications/user", user?.id],
  });

  const handleGenerateSummary = async () => {
    // TODO: Implement summary generation
    console.log(`Generating ${summaryFormat} summary filtered by ${summaryFilter}`);
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
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{user?.name}</CardTitle>
                <CardDescription>
                  {user?.designation} at {user?.department}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
        <div className="flex justify-between items-center mb-6">
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