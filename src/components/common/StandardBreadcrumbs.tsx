import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface StandardBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const StandardBreadcrumbs = ({ items, className = "" }: StandardBreadcrumbsProps) => {
  return (
    <Breadcrumb className={`mb-6 ${className}`}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            {item.isActive || !item.href ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};