import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set worker source using local file from node_modules
pdfjs.GlobalWorkerOptions.workerSrc = `/node_modules/pdfjs-dist/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PDFViewer({ url, open, onOpenChange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<Error | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function changeScale(delta: number) {
    setScale(prevScale => Math.max(0.5, Math.min(2.0, prevScale + delta)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeScale(-0.1)}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeScale(0.1)}
                disabled={scale >= 2.0}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex justify-center bg-muted/30 rounded-lg p-4">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error("Error loading PDF:", error);
                setError(error);
              }}
              loading={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
                  <p className="font-medium">Error loading PDF</p>
                  <p className="text-sm text-muted-foreground">
                    {error?.message || "Please try again later"}
                  </p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                loading={
                  <div className="flex items-center justify-center h-[800px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }
                className="shadow-lg"
              />
            </Document>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}