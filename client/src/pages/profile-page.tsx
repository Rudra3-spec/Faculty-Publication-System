import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, FileText, Download, Edit, Book, BookOpen, Filter, Camera, Link2 } from "lucide-react";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SiGooglescholar, SiLinkedin, SiResearchgate, SiX, SiFacebook, SiInstagram } from "react-icons/si";


type SummaryFormat = "PDF" | "Word" | "Web";
type SummaryFilter = "year" | "type" | "area";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>("PDF");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("year");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const form = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user?.name,
      department: user?.department,
      designation: user?.designation,
      bio: user?.bio || "",
      researchInterests: user?.researchInterests || "",
      contactEmail: user?.contactEmail || "",
      linkedinUrl: user?.linkedinUrl || "",
      googleScholarUrl: user?.googleScholarUrl || "",
      researchGateUrl: user?.researchGateUrl || "",
      twitterUrl: user?.twitterUrl || "",
      facebookUrl: user?.facebookUrl || "",
      instagramUrl: user?.instagramUrl || "",
      personalWebsite: user?.personalWebsite || "",
      education: user?.education || "",
      awards: user?.awards || "",
      officeHours: user?.officeHours || "",
      officeLocation: user?.officeLocation || "",
      college: user?.college || "",
      school: user?.school || "",
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/user/photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile photo updated" });
      setIsUploadingPhoto(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload photo",
        description: error.message,
        variant: "destructive",
      });
      setIsUploadingPhoto(false);
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      uploadPhotoMutation.mutate(file);
    }
  };

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
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.profilePicture} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0">
                      <label
                        htmlFor="photo-upload"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary hover:bg-primary/90 cursor-pointer"
                      >
                        <Camera className="h-4 w-4 text-primary-foreground" />
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                          disabled={isUploadingPhoto}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">{user?.name}</CardTitle>
                    <CardDescription>
                      {user?.designation} at {user?.department}
                    </CardDescription>
                  </div>
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
                      <div className="space-y-4">
                        <h3 className="font-medium">Social Media & Professional Links</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="linkedinUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <SiLinkedin className="h-4 w-4" />
                                  LinkedIn
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://linkedin.com/in/username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="googleScholarUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <SiGooglescholar className="h-4 w-4" />
                                  Google Scholar
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://scholar.google.com/..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="researchGateUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <SiResearchgate className="h-4 w-4" />
                                  ResearchGate
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://researchgate.net/profile/..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="twitterUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <SiX className="h-4 w-4" />
                                  Twitter
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://twitter.com/username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="facebookUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <SiFacebook className="h-4 w-4" />
                                  Facebook
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://facebook.com/username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="instagramUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <SiInstagram className="h-4 w-4" />
                                  Instagram
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://instagram.com/username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="font-medium">Academic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="college"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>College/University</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter your college/university name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="school"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>School</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter your school name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="education"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Education</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Enter any additional educational background" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="awards"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Awards & Honors</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="List your academic awards and honors" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="officeHours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Office Hours</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Mon-Wed 2-4 PM" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="officeLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Office Location</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Building A, Room 123" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
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
                  <div className="space-y-6">
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
                    {(user?.linkedinUrl ||
                      user?.googleScholarUrl ||
                      user?.researchGateUrl ||
                      user?.twitterUrl ||
                      user?.facebookUrl ||
                      user?.instagramUrl) && (
                      <div>
                        <h3 className="font-semibold mb-3">Professional Links</h3>
                        <div className="flex flex-wrap gap-3">
                          {user?.linkedinUrl && (
                            <a
                              href={user.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
                            >
                              <SiLinkedin className="h-4 w-4" />
                              LinkedIn
                            </a>
                          )}
                          {user?.googleScholarUrl && (
                            <a
                              href={user.googleScholarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
                            >
                              <SiGooglescholar className="h-4 w-4" />
                              Google Scholar
                            </a>
                          )}
                          {user?.researchGateUrl && (
                            <a
                              href={user.researchGateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
                            >
                              <SiResearchgate className="h-4 w-4" />
                              ResearchGate
                            </a>
                          )}
                          {user?.twitterUrl && (
                            <a
                              href={user.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
                            >
                              <SiX className="h-4 w-4" />
                              Twitter
                            </a>
                          )}
                          {user?.facebookUrl && (
                            <a
                              href={user.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
                            >
                              <SiFacebook className="h-4 w-4" />
                              Facebook
                            </a>
                          )}
                          {user?.instagramUrl && (
                            <a
                              href={user.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
                            >
                              <SiInstagram className="h-4 w-4" />
                              Instagram
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {user?.education && (
                      <div>
                        <h3 className="font-semibold mb-2">Education</h3>
                        <p className="text-muted-foreground whitespace-pre-line">{user.education}</p>
                      </div>
                    )}
                    {user?.awards && (
                      <div>
                        <h3 className="font-semibold mb-2">Awards & Honors</h3>
                        <p className="text-muted-foreground whitespace-pre-line">{user.awards}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {user?.officeHours && (
                        <div>
                          <h3 className="font-semibold mb-2">Office Hours</h3>
                          <p className="text-muted-foreground">{user.officeHours}</p>
                        </div>
                      )}
                      {user?.officeLocation && (
                        <div>
                          <h3 className="font-semibold mb-2">Office Location</h3>
                          <p className="text-muted-foreground">{user.officeLocation}</p>
                        </div>
                      )}
                    </div>
                    {user?.college && (
                      <div>
                        <h3 className="font-semibold mb-2">College/University</h3>
                        <p className="text-muted-foreground">{user.college}</p>
                      </div>
                    )}
                    {user?.school && (
                      <div>
                        <h3 className="font-semibold mb-2">School</h3>
                        <p className="text-muted-foreground">{user.school}</p>
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