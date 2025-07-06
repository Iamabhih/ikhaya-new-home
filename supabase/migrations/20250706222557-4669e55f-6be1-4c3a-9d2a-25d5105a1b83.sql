-- Remove brand names that were incorrectly added as categories
DELETE FROM public.categories 
WHERE name IN (
  'Herevin', 'Luminarc', 'Citinova', 'Otima', 'Ikhaya', 
  'Cadac', 'Addis', 'Tramontina', 'Arcos'
);

-- Also remove old/duplicate category entries that aren't in the proper list
DELETE FROM public.categories 
WHERE name NOT IN (
  'Glassware', 'Stoneware', 'Catering', 'Cuttlery', 'Kitchenware', 
  'Bakeware', 'Plasticware', 'Packaging & Gifting', 'Toys', 
  'Pots & Pans', 'Outdoor', 'Hardware', 'Electrical', 'Appliances', 'Brushware'
);