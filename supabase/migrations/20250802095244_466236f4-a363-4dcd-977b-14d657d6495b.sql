-- Make banner title column nullable to allow optional titles
ALTER TABLE promotional_banners 
ALTER COLUMN title DROP NOT NULL;