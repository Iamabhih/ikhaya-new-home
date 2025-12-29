import { Helmet } from 'react-helmet-async';

interface ProductSchemaProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    compare_at_price?: number;
    sku?: string;
    stock_quantity?: number;
    average_rating?: number;
    review_count?: number;
    categories?: { name: string };
  };
  images: string[];
  url: string;
}

export const ProductSchema = ({ product, images, url }: ProductSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: images.length > 0 ? images : undefined,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'OZZ SA',
    },
    offers: {
      '@type': 'Offer',
      url: `https://ozzsa.com${url}`,
      priceCurrency: 'ZAR',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock_quantity && product.stock_quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'OZZ SA',
      },
    },
    ...(product.average_rating && product.review_count && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.average_rating,
        reviewCount: product.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(product.categories && {
      category: product.categories.name,
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export const OrganizationSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OZZ SA',
    url: 'https://ozzsa.com',
    logo: 'https://ozzsa.com/ozz-logo.jpg',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English'],
    },
    sameAs: [],
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export const BreadcrumbSchema = ({ items }: { items: { name: string; url: string }[] }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://ozzsa.com${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default ProductSchema;
