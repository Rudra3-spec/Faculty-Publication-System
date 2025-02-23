import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Publication } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash2, Download, ExternalLink, Eye, Loader2, FileText } from "lucide-react";
import PublicationForm from "./publication-form";
import PDFViewer from "./pdf-viewer";

interface PublicationListProps {
  userId?: number;
  showActions?: boolean;
}

export default function PublicationList({
  userId,
  showActions = false
}: PublicationListProps) {
  const [editPublication, setEditPublication] = useState<Publication | null>(null);
  const [deletePublication, setDeletePublication] = useState<Publication | null>(null);
  const [viewingPublication, setViewingPublication] = useState<Publication | null>(null);
  const [viewingPdf, setViewingPdf] = useState<Publication | null>(null);
  const { toast } = useToast();

  const { data: publications = [], isLoading } = useQuery({
    queryKey: userId ? ["/api/publications", "user", userId] : ["/api/publications"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        userId ? `/api/publications/user/${userId}` : "/api/publications"
      );
      const data = await res.json();
      return data as Publication[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/publications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/publications", "user", userId] });
      toast({ title: "Publication deleted successfully" });
      setDeletePublication(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting publication",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!publications.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No publications found.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {publications.map((publication) => (
          <Card
            key={publication.id}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setViewingPublication(publication)}
          >
            <CardHeader>
              <CardTitle className="line-clamp-2">{publication.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  by {publication.authors}
                </p>
                <p className="text-sm">
                  {publication.venue}, {publication.year}
                </p>
                {publication.doi && (
                  <a
                    href={`https://doi.org/${publication.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    DOI: {publication.doi}
                  </a>
                )}
                {showActions && (
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditPublication(publication)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit publication details</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletePublication(publication)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete this publication</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!viewingPublication} onOpenChange={() => setViewingPublication(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewingPublication?.title}</DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{viewingPublication?.type}</span>
              <span>•</span>
              <span>{viewingPublication?.year}</span>
            </div>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publication Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-primary mb-1">Authors</h3>
                  <p className="text-lg">{viewingPublication?.authors}</p>
                </div>
                <div>
                  <h3 className="font-medium text-primary mb-1">Published in</h3>
                  <p className="text-lg">{viewingPublication?.venue}</p>
                </div>
                {viewingPublication?.doi && (
                  <div>
                    <h3 className="font-medium text-primary mb-1">DOI</h3>
                    <a
                      href={`https://doi.org/${viewingPublication.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-primary flex items-center gap-2 hover:underline"
                    >
                      <ExternalLink className="h-5 w-5" />
                      {viewingPublication.doi}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Research Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-primary mb-2">Abstract</h3>
                  <p className="text-muted-foreground leading-relaxed">{viewingPublication?.abstract}</p>
                </div>
                <div>
                  <h3 className="font-medium text-primary mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingPublication?.keywords.split(',').map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted rounded-md text-sm"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                {viewingPublication?.researchArea && (
                  <div>
                    <h3 className="font-medium text-primary mb-2">Research Area</h3>
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-md">
                      {viewingPublication.researchArea}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {viewingPublication?.pdfUrl && (
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    setViewingPublication(null);
                    setViewingPdf(viewingPublication);
                  }}
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View Full Paper
                </Button>
                <Button variant="outline" size="lg" className="flex-1" asChild>
                  <a
                    href={viewingPublication.pdfUrl}
                    download={`${viewingPublication.title}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPublication} onOpenChange={() => setEditPublication(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Edit Publication</DialogTitle>
          </DialogHeader>
          {editPublication && (
            <PublicationForm
              publication={editPublication}
              publicationId={editPublication.id}
              onSuccess={() => setEditPublication(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePublication}
        onOpenChange={() => setDeletePublication(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              publication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePublication && deleteMutation.mutate(deletePublication.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewingPdf?.pdfUrl && (
        <PDFViewer
          url={viewingPdf.pdfUrl}
          open={!!viewingPdf}
          onOpenChange={() => setViewingPdf(null)}
        />
      )}
    </>
  );
}