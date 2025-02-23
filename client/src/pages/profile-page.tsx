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
import { COLLEGES, CITIES, STATES } from "@/components/institution-suggestions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ResearchImpactDashboard from "@/components/research-impact-dashboard";

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
  const [openCollegePopover, setOpenCollegePopover] = useState(false);
  const [openAlmaCollegePopover, setOpenAlmaCollegePopover] = useState(false);
  const [openCurrentCityPopover, setOpenCurrentCityPopover] = useState(false);
  const [openCurrentStatePopover, setOpenCurrentStatePopover] = useState(false);
  const [openAlmaCityPopover, setOpenAlmaCityPopover] = useState(false);
  const [openAlmaStatePopover, setOpenAlmaStatePopover] = useState(false);

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
      almaCollege: user?.almaCollege || "",
      almaSchool: user?.almaSchool || "",
      currentCity: user?.currentCity || "",
      currentState: user?.currentState || "",
      almaCity: user?.almaCity || "",
      almaState: user?.almaState || "",
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

  const { data: publications = [], isLoading } = useQuery<Publication[]>({
    queryKey: ["/api/publications/user", user?.id],
    enabled: !!user?.id,
  });

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
                        <h3 className="font-medium">Current Institution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="college"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Current Institution</FormLabel>
                                <Popover open={openCollegePopover} onOpenChange={setOpenCollegePopover}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Institution where you work"
                                        className="w-full"
                                      />
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search institutions..." />
                                      <CommandEmpty>No institution found.</CommandEmpty>
                                      <CommandGroup>
                                        {COLLEGES.map((college) => (
                                          <CommandItem
                                            key={college}
                                            onSelect={() => {
                                              form.setValue("college", college);
                                              setOpenCollegePopover(false);
                                            }}
                                          >
                                            {college}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="school"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Department/School</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Department/School where you work" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="currentCity"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>City</FormLabel>
                                <Popover open={openCurrentCityPopover} onOpenChange={setOpenCurrentCityPopover}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Input {...field} placeholder="Select city" />
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search cities..." />
                                      <CommandEmpty>No city found.</CommandEmpty>
                                      <CommandGroup>
                                        {CITIES.map((city) => (
                                          <CommandItem
                                            key={city}
                                            onSelect={() => {
                                              form.setValue("currentCity", city);
                                              setOpenCurrentCityPopover(false);
                                            }}
                                          >
                                            {city}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="currentState"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>State</FormLabel>
                                <Popover open={openCurrentStatePopover} onOpenChange={setOpenCurrentStatePopover}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Input {...field} placeholder="Select state" />
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search states..." />
                                      <CommandEmpty>No state found.</CommandEmpty>
                                      <CommandGroup>
                                        {STATES.map((state) => (
                                          <CommandItem
                                            key={state}
                                            onSelect={() => {
                                              form.setValue("currentState", state);
                                              setOpenCurrentStatePopover(false);
                                            }}
                                          >
                                            {state}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <h3 className="font-medium">Educational Background</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="almaCollege"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Alma Mater Institution</FormLabel>
                                <Popover open={openAlmaCollegePopover} onOpenChange={setOpenAlmaCollegePopover}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Institution where you studied"
                                        className="w-full"
                                      />
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search institutions..." />
                                      <CommandEmpty>No institution found.</CommandEmpty>
                                      <CommandGroup>
                                        {COLLEGES.map((college) => (
                                          <CommandItem
                                            key={college}
                                            onSelect={() => {
                                              form.setValue("almaCollege", college);
                                              setOpenAlmaCollegePopover(false);
                                            }}
                                          >
                                            {college}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="almaSchool"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Alma Mater School</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="School where you studied" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="almaCity"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>City</FormLabel>
                                <Popover open={openAlmaCityPopover} onOpenChange={setOpenAlmaCityPopover}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Input {...field} placeholder="Select city" />
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search cities..." />
                                      <CommandEmpty>No city found.</CommandEmpty>
                                      <CommandGroup>
                                        {CITIES.map((city) => (
                                          <CommandItem
                                            key={city}
                                            onSelect={() => {
                                              form.setValue("almaCity", city);
                                              setOpenAlmaCityPopover(false);
                                            }}
                                          >
                                            {city}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="almaState"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>State</FormLabel>
                                <Popover open={openAlmaStatePopover} onOpenChange={setOpenAlmaStatePopover}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Input {...field} placeholder="Select state" />
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search states..." />
                                      <CommandEmpty>No state found.</CommandEmpty>
                                      <CommandGroup>
                                        {STATES.map((state) => (
                                          <CommandItem
                                            key={state}
                                            onSelect={() => {
                                              form.setValue("almaState", state);
                                              setOpenAlmaStatePopover(false);
                                            }}
                                          >
                                            {state}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
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
                        <div className="grid grid-cols1 md:grid-cols-2 gap-4">
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
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generate Summary</CardTitle>
                <CardDescription>
                  Export your publications in various formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Format</h3>
                    <Select
                      value={summaryFormat}
                      onValueChange={(value) => setSummaryFormat(value as SummaryFormat)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="Word">Word</SelectItem>
                        <SelectItem value="Web">Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Group By</h3>
                    <Select
                      value={summaryFilter}
                      onValueChange={(value) => setSummaryFilter(value as SummaryFilter)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Group By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Publication Year</SelectItem>
                        <SelectItem value="type">Publication Type</SelectItem>
                        <SelectItem value="area">Research Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateSummary}
                  disabled={isLoading}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      {/* Research Impact Dashboard */}
      <div className="container mx-auto px-4 py-6">
        <ResearchImpactDashboard publications={publications} />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Publications</CardTitle>
                <CardDescription>
                  Manage and showcase your research publications
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Publication
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Publication</DialogTitle>
                  </DialogHeader>
                  <PublicationForm onSuccess={() => setIsDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <PublicationList
                publications={publications}
                isLoading={isLoading}
                showActions
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Research Areas
              </CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {researchAreas.length > 0 ? (
                <div className="space-y-2">
                  {researchAreas.map((area) => (
                    <div
                      key={area}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{area}</span>
                      <span className="text-muted-foreground">
                        {publications.filter((p) => p.researchArea === area).length}                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No research areas defined yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}