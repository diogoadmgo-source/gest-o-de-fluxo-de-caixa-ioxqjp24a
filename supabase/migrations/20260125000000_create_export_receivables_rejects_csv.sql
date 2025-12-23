CREATE OR REPLACE FUNCTION export_receivables_rejects_csv(p_batch_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_csv text;
BEGIN
    SELECT 
        'Linha;Motivo;Nota Fiscal;Cliente;Valor;Vencimento;Dados Originais' || E'\n' ||
        COALESCE(string_agg(
            format(
                '%s;%s;%s;%s;%s;%s;%s',
                r.row_number,
                -- Translate reasons to user friendly text
                CASE r.reason 
                    WHEN 'invoice_number_vazio' THEN 'Nota Fiscal vazia'
                    WHEN 'customer_vazio' THEN 'Cliente vazio'
                    WHEN 'valor_invalido' THEN 'Valor inválido'
                    WHEN 'data_vencimento_invalida' THEN 'Data Vencimento inválida'
                    WHEN 'duplicado_lote' THEN 'Duplicado (Mesmo Lote)'
                    WHEN 'parcela_formato_invalido' THEN 'Parcela inválida'
                    WHEN 'valor_negativo' THEN 'Valor Negativo'
                    WHEN 'valor_atualizado_negativo' THEN 'Valor Atualizado Negativo'
                    WHEN 'vencimento_menor_emissao' THEN 'Vencimento menor que Emissão'
                    WHEN 'linha_invalida' THEN 'Linha Inválida (Lixo/Total)'
                    ELSE COALESCE(r.reason, 'Erro Desconhecido') 
                END,
                -- Escape CSV fields: Wrap in quotes, escape internal quotes by doubling them
                '"' || REPLACE(COALESCE(r.raw_data->>'invoice_number', ''), '"', '""') || '"',
                '"' || REPLACE(COALESCE(r.raw_data->>'customer', ''), '"', '""') || '"',
                '"' || REPLACE(COALESCE(r.raw_data->>'principal_value', ''), '"', '""') || '"',
                '"' || REPLACE(COALESCE(r.raw_data->>'due_date', ''), '"', '""') || '"',
                '"' || REPLACE(r.raw_data::text, '"', '""') || '"'
            ),
            E'\n'
            ORDER BY r.row_number
        ), '')
    INTO v_csv
    FROM import_receivables_rejects r
    WHERE r.batch_id = p_batch_id;

    RETURN v_csv;
END;
$$;
