import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface StandardPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

export const StandardPagination = ({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  showInfo = true,
  className = ""
}: StandardPaginationProps) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    if (totalPages === 1) return [1];
    
    // Calculate range around current page
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    // Add first page and ellipsis if needed
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    // Add middle range
    rangeWithDots.push(...range);

    // Add ellipsis and last page if needed
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1 && !rangeWithDots.includes(totalPages)) {
      rangeWithDots.push(totalPages);
    }

    // Remove duplicates and return unique pages
    return [...new Set(rangeWithDots)];
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [];

  return (
    <Card className={`border-0 bg-white/50 backdrop-blur-sm shadow-lg ${className}`}>
      <div className="p-6">
        <div className="flex justify-center items-center gap-2 flex-wrap">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          {/* Page Numbers */}
          <div className="flex gap-1">
            {visiblePages.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <div className="flex items-center justify-center w-10 h-10">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className={`w-10 h-10 p-0 transition-all duration-200 ${
                      currentPage === page 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Pagination Info */}
        {showInfo && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            <span className="hidden sm:inline">
              Page {currentPage} of {totalPages} • {totalCount.toLocaleString()} total items
            </span>
            <span className="sm:hidden">
              {currentPage}/{totalPages} • {totalCount.toLocaleString()} items
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};