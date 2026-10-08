import { expect, test } from '@playwright/test';

test('sem migração Supabase validada, reset remoto não pode ser escolhido',async({page})=>{
 await page.goto('/#conta/ajuda');
 await page.getByRole('button',{name:'Resetar todos os dados'}).click();
 const dialog=page.getByRole('dialog',{name:/Resetar dados deste dispositivo/});
 await expect(dialog.getByRole('radio',{name:/Resetar somente este dispositivo/})).toBeChecked();
 await expect(dialog.getByRole('radio',{name:'Resetar dispositivo e nuvem'})).toBeDisabled();
 await expect(dialog).toContainText('migração SQL/RLS');
 await dialog.getByRole('button',{name:'Cancelar'}).click();
 await expect(dialog).toBeHidden();
});
