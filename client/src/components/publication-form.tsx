import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertPublicationSchema, InsertPublication } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PublicationFormProps {
  publication?: InsertPublication;
  publicationId?: number;
  onSuccess?: () => void;
}

const PUBLICATION_TYPES = [
  "Journal Article",
  "Conference Paper",
  "Book Chapter",
  "Workshop Paper",
  "Technical Report",
  "Other"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: 30 },
  (_, i) => CURRENT_YEAR - i
);

export default function PublicationForm({
  publication,
  publicationId,
  onSuccess
}: PublicationFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const form = useForm<InsertPublication>({
    resolver: zodResolver(insertPublicationSchema),
    defaultValues: publication || {
      title: "",
      authors: "",
      venue: "",
      year: CURRENT_YEAR,
      type: "Journal Article",
      doi: "",
      abstract: "",
      keywords: "",
      pdfUrl: "",
      researchArea: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertPublication) => {
      // Ensure userId is included in the data
      const publicationData = {
        ...data,
        userId: user?.id,
      };

      const res = await apiRequest(
        publicationId ? "PUT" : "POST",
        publicationId ? `/api/publications/${publicationId}` : "/api/publications",
        publicationData
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save publication");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/publications/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/publications/user", user?.id] });
      toast({
        title: `Publication ${publicationId ? "updated" : "added"} successfully`,
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving publication",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PUBLICATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year <span className="text-destructive">*</span></FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="authors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authors <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                Enter authors' names separated by commas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="venue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Journal/Conference Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DOI</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value || ""}
                  placeholder="e.g., 10.1000/xyz123" 
                />
              </FormControl>
              <FormDescription>
                Digital Object Identifier (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="abstract"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abstract <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., machine learning, artificial intelligence, neural networks" />
              </FormControl>
              <FormDescription>
                Enter keywords separated by commas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="researchArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Research Area</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value || ""}
                  placeholder="e.g., Computer Science, Machine Learning" 
                />
              </FormControl>
              <FormDescription>
                Main research area for this publication
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pdfUrl"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>PDF Document</FormLabel>
              <FormControl>
                <div className="flex gap-4 items-center">
                  <Input
                    type="file"
                    accept=".pdf"
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onChange(URL.createObjectURL(file));
                      }
                    }}
                    {...field}
                  />
                  {value && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => onChange("")}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload a PDF version of your publication (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {publicationId ? "Update" : "Add"} Publication
        </Button>
      </form>
    </Form>
  );
}