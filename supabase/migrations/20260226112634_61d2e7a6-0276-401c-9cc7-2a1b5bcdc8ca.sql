-- Allow managers to INSERT products
CREATE POLICY "Managers can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to UPDATE products
CREATE POLICY "Managers can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to DELETE products
CREATE POLICY "Managers can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to INSERT product_images
CREATE POLICY "Managers can insert product_images"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to UPDATE product_images
CREATE POLICY "Managers can update product_images"
ON public.product_images
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to DELETE product_images
CREATE POLICY "Managers can delete product_images"
ON public.product_images
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow managers full access to product_image_candidates
CREATE POLICY "Managers can manage product_image_candidates"
ON public.product_image_candidates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));