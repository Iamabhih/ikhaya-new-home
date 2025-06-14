
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
    const row: any = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }

  return data
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const csvText = await file.text()
    
    if (action === 'preview') {
      // Preview mode - parse and return first few rows
      try {
        const data = parseCSV(csvText)
        const preview = data.slice(0, 5) // First 5 rows
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            preview,
            totalRows: data.length,
            headers: Object.keys(data[0] || {})
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        return new Response(
          JSON.stringify({ error: `CSV parsing error: ${error.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (action === 'import') {
      // Import mode - process the entire file
      try {
        console.log('Starting CSV import for user:', user.id)
        
        const data = parseCSV(csvText)
        
        // Create import record
        const { data: importRecord, error: importError } = await supabase
          .from('product_imports')
          .insert({
            user_id: user.id,
            filename: file.name,
            total_rows: data.length,
            status: 'processing',
            import_data: data
          })
          .select()
          .single()

        if (importError) {
          console.error('Error creating import record:', importError)
          throw new Error('Failed to create import record')
        }

        console.log('Created import record:', importRecord.id)

        // Process products in batches
        const batchSize = 50
        let totalSuccessful = 0
        let totalFailed = 0
        let allErrors: any[] = []

        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize)
          
          // Use the database function for bulk insert
          const { data: result, error: processError } = await supabase
            .rpc('bulk_insert_products', {
              products_data: batch,
              import_id_param: importRecord.id
            })

          if (processError) {
            console.error('Error processing batch:', processError)
            throw new Error(`Failed to process batch: ${processError.message}`)
          }

          totalSuccessful += result.successful
          totalFailed += result.failed
          allErrors = allErrors.concat(result.errors || [])

          // Update progress
          await supabase
            .from('product_imports')
            .update({
              processed_rows: i + batch.length,
              successful_rows: totalSuccessful,
              failed_rows: totalFailed
            })
            .eq('id', importRecord.id)
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
          .eq('id', importRecord.id)

        console.log(`Import completed: ${totalSuccessful} successful, ${totalFailed} failed`)

        return new Response(
          JSON.stringify({
            success: true,
            importId: importRecord.id,
            results: {
              total: data.length,
              successful: totalSuccessful,
              failed: totalFailed,
              errors: allErrors.slice(0, 10) // Return first 10 errors
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error) {
        console.error('Import error:', error)
        
        return new Response(
          JSON.stringify({ error: `Import failed: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
