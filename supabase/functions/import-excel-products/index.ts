import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
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
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      console.warn(`Sheet ${sheetName} has insufficient data`);
      return;
    }
    
    const headers = jsonData[0] as string[];
    const products = jsonData.slice(1).map((row: any[]) => {
      const product: any = {};
      headers.forEach((header, index) => {
        product[header] = row[index] || '';
      });
      return product;
    }).filter(product => product.name || product.Name || product.product_name);
    
    sheetsData.push({
      sheetName,
      categoryName: sheetName.trim(),
      products,
      headers
    });
  });
  
  return sheetsData;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
  
  // Create new category
  const { data: newCategory, error } = await supabase
    .from('categories')
    .insert({
      name: categoryName,
      slug,
      is_active: true
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Failed to create category ${categoryName}: ${error.message}`);
  }
  
  return newCategory.id;
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
          const batchSize = 25;
          for (let i = 0; i < productsWithCategory.length; i += batchSize) {
            const batch = productsWithCategory.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1} for sheet ${sheetData.sheetName}`);
            
            const { data: result, error: processError } = await supabase
              .rpc('bulk_insert_products', {
                products_data: batch,
                import_id_param: importRecord.id
              });

            if (processError) {
              console.error('Error processing batch:', processError);
              totalFailed += batch.length;
              allErrors.push({ 
                sheet: sheetData.sheetName, 
                error: processError.message,
                batch: Math.floor(i/batchSize) + 1
              });
              continue;
            }

            console.log('Batch result:', result);
            totalSuccessful += result.successful;
            totalFailed += result.failed;
            allErrors = allErrors.concat(result.errors || []);
          }
          
        } catch (error) {
          console.error(`Error processing sheet ${sheetData.sheetName}:`, error);
          totalFailed += sheetData.products.length;
          allErrors.push({ 
            sheet: sheetData.sheetName, 
            error: error.message
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