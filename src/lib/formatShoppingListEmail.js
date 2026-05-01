import { CATEGORY_LABELS, CATEGORY_ORDER, groupItemsByCategory } from './shoppingListUtils'

export function formatShoppingListEmail(items, weekLabel = 'This Week', householdName = 'My Household') {
  const categoryColors = {
    produce: '#4A9B6E',
    protein: '#D97B5A',
    dairy: '#6B9ED6',
    pantry: '#C4976B',
    frozen: '#8BBDD4',
    bakery: '#D4A85B',
    other: '#9C9589',
  }

  const itemsByCategory = groupItemsByCategory(items)

  let categoriesHtml = ''
  for (const category of CATEGORY_ORDER) {
    const catItems = itemsByCategory[category]
    if (!catItems?.length) continue

    const color = categoryColors[category] || categoryColors.other
    const catLabel = CATEGORY_LABELS[category] || 'Other'

    let itemsRows = ''
    for (const item of catItems) {
      itemsRows += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F5F3EF;">
            <span style="color: ${color}; margin-right: 8px;">☐</span>
            <span style="${item.checked ? 'text-decoration: line-through; color: #9C9589;' : 'color: #2D2A26;'}">${item.name}</span>
            <span style="float: right; color: #5C564E; font-size: 13px;">${item.quantity} ${item.unit}</span>
            ${item.used_in?.length ? `<div style="font-size: 11px; color: #9C9589; margin-top: 2px;">${item.used_in.map((usage) => usage.replace('_', ' ')).join(', ')}</div>` : ''}
          </td>
        </tr>
      `
    }

    categoriesHtml += `
      <tr>
        <td style="padding: 16px 0 8px 0; border-left: 3px solid ${color}; padding-left: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px;">${catLabel}</h3>
        </td>
      </tr>
      ${itemsRows}
    `
  }

  const totalItems = items.length
  const checkedItems = items.filter((item) => item.checked).length

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F3EF; font-family: 'DM Sans', system-ui, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3EF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 0 0 24px 0;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; color: #4A9B6E;">Allio</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #FFFFFF; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <h2 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px; color: #2D2A26;">Your shopping list</h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #5C564E;">
                ${weekLabel} · ${householdName} · ${totalItems} items
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${categoriesHtml}
              </table>
              <div style="margin-top: 24px; padding: 16px; background: #F5F3EF; border-radius: 8px;">
                <div style="font-size: 13px; color: #5C564E; margin-bottom: 8px;">${checkedItems} of ${totalItems} items checked</div>
                <div style="height: 6px; background: #E8E5DF; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${totalItems ? (checkedItems / totalItems * 100) : 0}%; background: #4A9B6E; border-radius: 3px;"></div>
                </div>
              </div>
              <div style="margin-top: 32px; text-align: center;">
                <a href="https://allio.life/groceries" style="display: inline-block; background-color: #4A9B6E; color: #FFFFFF; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                  Open in Allio
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9C9589;">
                <a href="https://allio.life" style="color: #4A9B6E; text-decoration: none;">Allio</a>, Dinner, figured out.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
