import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SheetData {
  sheetName: string;
  categoryName: string;
  products: any[];
  headers: string[];
}

function parseExcelFile(arrayBuffer: ArrayBuffer): SheetData[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetsData: SheetData[] = [];
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`Processing sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    
    // Try different parsing methods to ensure we get all data
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    console.log(`Sheet ${sheetName} raw data length: ${jsonData.length}`);
    
    if (jsonData.length < 2) {
      console.warn(`Sheet ${sheetName} has insufficient data (${jsonData.length} rows)`);
      return;
    }
    
    // Find the header row (first non-empty row)
    let headerRowIndex = 0;
    let headers: string[] = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (row && row.length > 0 && row.some(cell => cell && String(cell).trim() !== '')) {
        headers = row.map(cell => String(cell || '').trim()).filter(h => h !== '');
        headerRowIndex = i;
        break;
      }
    }
    
    if (headers.length === 0) {
      console.warn(`Sheet ${sheetName} has no valid headers`);
      return;
    }
    
    console.log(`Sheet ${sheetName} headers:`, headers);
    
    // Process data rows starting after the header
    const products = jsonData.slice(headerRowIndex + 1).map((row: unknown, rowIndex) => {
      const rowArray = row as any[];
      if (!rowArray || rowArray.length === 0) return null;
      
      const product: any = {};
      headers.forEach((header, colIndex) => {
        let value = rowArray[colIndex];
        
        // Skip empty values
        if (value === undefined || value === null || String(value).trim() === '') {
          value = null;
        } else {
          value = String(value).trim();
        }
        
        // Normalize header names for common fields
        const normalizedHeader = header.toLowerCase();
        let finalKey = header;
        
        // Map common variations to standard field names
        if (normalizedHeader.includes('name') || normalizedHeader === 'product' || normalizedHeader === 'title') {
          finalKey = 'name';
        } else if (normalizedHeader.includes('price') && !normalizedHeader.includes('compare')) {
          finalKey = 'price';
        } else if (normalizedHeader.includes('compare') || normalizedHeader.includes('was') || normalizedHeader.includes('original')) {
          finalKey = 'compare_at_price';
        } else if (normalizedHeader.includes('stock') || normalizedHeader.includes('quantity') || normalizedHeader.includes('qty')) {
          finalKey = 'stock_quantity';
        } else if (normalizedHeader.includes('description') && !normalizedHeader.includes('short')) {
          finalKey = 'description';
        } else if (normalizedHeader.includes('short') && normalizedHeader.includes('description')) {
          finalKey = 'short_description';
        } else if (normalizedHeader.includes('sku') || normalizedHeader.includes('code')) {
          finalKey = 'sku';
        } else if (normalizedHeader.includes('feature')) {
          finalKey = 'is_featured';
        } else if (normalizedHeader.includes('active') || normalizedHeader.includes('status')) {
          finalKey = 'is_active';
        }
        
        // Convert numeric fields
        if (['price', 'compare_at_price', 'stock_quantity'].includes(finalKey) && value !== null) {
          if (finalKey.includes('price')) {
            // Handle price values - remove currency symbols and parse
            const cleanValue = String(value).replace(/[^\d.-]/g, '');
            const numValue = parseFloat(cleanValue);
            value = isNaN(numValue) ? null : numValue;
          } else if (finalKey === 'stock_quantity') {
            const numValue = parseInt(String(value));
            value = isNaN(numValue) ? 0 : numValue;
          }
        }
        
        // Convert boolean fields
        if (['is_featured', 'is_active'].includes(finalKey) && value !== null) {
          const lowerValue = String(value).toLowerCase();
          value = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'y';
        }
        
        product[finalKey] = value;
      });
      
      // Only include products that have a name
      const hasName = product.name && String(product.name).trim() !== '';
      if (!hasName) {
        console.log(`Skipping row ${rowIndex + 1} in sheet ${sheetName}: no valid name`);
        return null;
      }
      
      return product;
    }).filter(product => product !== null);
    
    console.log(`Sheet ${sheetName} processed: ${products.length} valid products from ${jsonData.length - headerRowIndex - 1} data rows`);
    
    sheetsData.push({
      sheetName,
      categoryName: sheetName.trim(),
      products,
      headers
    });
  });
  
  console.log(`Total sheets processed: ${sheetsData.length}`);
  return sheetsData;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50); // Limit slug length
}

async function ensureCategory(supabase: any, categoryName: string): Promise<string> {
  const slug = generateSlug(categoryName);
  
  // Check if category exists
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();
    
  if (existingCategory) {
    return existingCategory.id;
  }
  
  // Try to create new category with conflict handling
  let attempts = 0;
  let uniqueSlug = slug;
  
  while (attempts < 5) {
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: categoryName,
        slug: uniqueSlug,
        is_active: true
      })
      .select('id')
      .single();
      
    if (!error) {
      return newCategory.id;
    }
    
    if (error.code === '23505') { // Unique constraint violation
      attempts++;
      uniqueSlug = `${slug}-${attempts}`;
      console.log(`Slug conflict, trying: ${uniqueSlug}`);
      continue;
    }
    
    throw new Error(`Failed to create category ${categoryName}: ${error.message}`);
  }
  
  throw new Error(`Failed to create category after multiple attempts: ${categoryName}`);
}

Deno.serve(async (req) => {
  console.log(`Excel Import function called: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      'https://kauostzhxqoxggwqgtym.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdW9zdHpoeHFveGdnd3FndHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1ODgzNTQsImV4cCI6MjA2NDE2NDM1NH0.dhjPI3gRv78kqxIQBS2Q9oHks_ezf92WNU1EjzcR8AM',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    // Verify authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: hasAdminRole, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (roleError || !hasAdminRole) {
      console.error('Role check failed:', roleError, hasAdminRole);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const action = formData.get('action') as string;
    const updateDuplicates = formData.get('updateDuplicates') === 'true';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${action} for Excel file: ${file.name} (${file.size} bytes)`);
    
    const arrayBuffer = await file.arrayBuffer();
    const sheetsData = parseExcelFile(arrayBuffer);
    
    if (action === 'preview') {
      // Preview mode - return sheet structure and sample data
      const preview = sheetsData.map(sheet => ({
        sheetName: sheet.sheetName,
        categoryName: sheet.categoryName,
        productCount: sheet.products.length,
        headers: sheet.headers,
        sampleProducts: sheet.products.slice(0, 3)
      }));
      
      console.log(`Preview generated: ${sheetsData.length} sheets`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          preview,
          totalSheets: sheetsData.length,
          totalProducts: sheetsData.reduce((sum, sheet) => sum + sheet.products.length, 0)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'import') {
      console.log('Starting Excel import for user:', user.id);
      
      const totalProducts = sheetsData.reduce((sum, sheet) => sum + sheet.products.length, 0);
      
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('product_imports')
        .insert({
          user_id: user.id,
          filename: file.name,
          total_rows: totalProducts,
          status: 'processing',
          import_data: { sheets: sheetsData.map(s => ({ 
            sheetName: s.sheetName, 
            categoryName: s.categoryName, 
            productCount: s.products.length 
          })) }
        })
        .select()
        .single();

      if (importError) {
        console.error('Error creating import record:', importError);
        throw new Error('Failed to create import record');
      }

      console.log('Created import record:', importRecord.id);

      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalUpdated = 0;
      let allErrors: any[] = [];

      // Process each sheet
      for (const sheetData of sheetsData) {
        console.log(`Processing sheet: ${sheetData.sheetName} with ${sheetData.products.length} products`);
        
        try {
          // Ensure category exists
          const categoryId = await ensureCategory(supabase, sheetData.categoryName);
          console.log(`Category ensured for ${sheetData.categoryName}: ${categoryId}`);
          
          // Add category_id to all products in this sheet
          const productsWithCategory = sheetData.products.map(product => ({
            ...product,
            category: sheetData.categoryName,
            category_id: categoryId
          }));
          
          // Process products in batches
          const batchSize = 10; // Smaller batches for stability
          for (let i = 0; i < productsWithCategory.length; i += batchSize) {
            const batch = productsWithCategory.slice(i, i + batchSize);
            const batchNum = Math.floor(i/batchSize) + 1;
            console.log(`Processing batch ${batchNum} for sheet ${sheetData.sheetName}`);
            
            try {
              // Add timeout for batch processing
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Batch timeout')), 30000)
              );
              
              const batchPromise = supabase.rpc('bulk_insert_products', {
                products_data: batch,
                import_id_param: importRecord.id,
                update_duplicates: updateDuplicates
              });
              
              const { data: result, error: processError } = await Promise.race([
                batchPromise,
                timeoutPromise
              ]) as any;

              if (processError) {
                console.error('Error processing batch:', processError);
                totalFailed += batch.length;
                allErrors.push({ 
                  sheet: sheetData.sheetName, 
                  error: processError.message,
                  batch: batchNum
                });
                continue;
              }

              console.log('Batch result:', result);
              totalSuccessful += result.successful || 0;
              totalFailed += result.failed || 0;
              totalUpdated += result.updated || 0;
              allErrors = allErrors.concat(result.errors || []);
              
            } catch (error) {
              console.error('Batch processing failed:', error);
              totalFailed += batch.length;
              allErrors.push({ 
                sheet: sheetData.sheetName, 
                error: (error as Error).message || 'Batch timeout or processing error',
                batch: batchNum
              });
            }
            
            // Update progress more frequently
            await supabase
              .from('product_imports')
              .update({
                processed_rows: totalSuccessful + totalFailed,
                successful_rows: totalSuccessful,
                failed_rows: totalFailed
              })
              .eq('id', importRecord.id);
          }
          
        } catch (error) {
          console.error(`Error processing sheet ${sheetData.sheetName}:`, error);
          totalFailed += sheetData.products.length;
          allErrors.push({ 
            sheet: sheetData.sheetName, 
            error: (error as Error).message
          });
        }
        
        // Update progress
        await supabase
          .from('product_imports')
          .update({
            processed_rows: totalSuccessful + totalFailed,
            successful_rows: totalSuccessful,
            failed_rows: totalFailed
          })
          .eq('id', importRecord.id);
      }

      // Mark import as completed
      await supabase
        .from('product_imports')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          successful_rows: totalSuccessful,
          failed_rows: totalFailed
        })
        .eq('id', importRecord.id);

      console.log(`Excel import completed: ${totalSuccessful} successful, ${totalFailed} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          importId: importRecord.id,
            results: {
              total: totalProducts,
              successful: totalSuccessful,
              failed: totalFailed,
              updated: totalUpdated,
              sheets: sheetsData.length,
              errors: allErrors.slice(0, 20)
            }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Excel import function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});