ALTER TABLE companies ADD COLUMN origin TEXT DEFAULT 'Sistema';

-- Update existing companies to have 'Sistema' origin if null (though default handles new ones)
UPDATE companies SET origin = 'Sistema' WHERE origin IS NULL;
