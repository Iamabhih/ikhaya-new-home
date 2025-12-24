-- Add customer role to user steelabhishek@gmail.com
INSERT INTO user_roles (user_id, role)
VALUES ('3cc95972-bfe9-46db-806c-ec528654d315', 'customer')
ON CONFLICT (user_id, role) DO NOTHING;