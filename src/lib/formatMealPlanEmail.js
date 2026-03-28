// Format meal plan email HTML
export function formatMealPlanEmail(planData, householdName = 'My Household', weekLabel = 'This Week') {
  const meals = planData?.meals || []
  
  // Group meals by day
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const dayLabels = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', 
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
  }
  
  const mealsByDay = {}
  for (const day of dayOrder) {
    mealsByDay[day] = meals.filter(m => m.day === day)
  }
  
  let mealsHtml = ''
  for (const day of dayOrder) {
    const dayMeals = mealsByDay[day]
    if (!dayMeals.length) continue
    
    mealsHtml += `
      <tr>
        <td style="padding: 16px 0 8px 0;">
          <h3 style="margin: 0; font-family: Georgia, serif; font-size: 16px; color: #2D2A26;">${dayLabels[day]}</h3>
        </td>
      </tr>
    `
    
    for (const meal of dayMeals) {
      const mealType = meal.meal?.charAt(0).toUpperCase() + meal.meal?.slice(1)
      mealsHtml += `
        <tr>
          <td style="padding: 12px 16px; background: #FFFFFF; border-radius: 8px; border: 1px solid #E8E5DF; margin-bottom: 8px;">
            <div style="font-size: 12px; color: #9C9589; text-transform: uppercase; letter-spacing: 0.5px;">${mealType}</div>
            <div style="font-family: Georgia, serif; font-size: 18px; color: #2D2A26; margin: 4px 0;">${meal.name}</div>
            <div style="font-size: 13px; color: #5C564E;">
              ${meal.prep_time_minutes} min prep · ${meal.cook_time_minutes} min cook · ${meal.servings} servings
            </div>
            ${meal.notes ? `<div style="font-size: 13px; font-style: italic; color: #9C9589; margin-top: 8px;">${meal.notes}</div>` : ''}
          </td>
        </tr>
      `
    }
  }
  
  const html = `
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
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; color: #4A9B6E;">Allio</h1>
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td style="background: #FFFFFF; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <h2 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px; color: #2D2A26;">Your meal plan is ready</h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #5C564E;">
                ${weekLabel} · ${householdName}
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                ${mealsHtml}
              </table>
              
              <!-- CTA Button -->
              <div style="margin-top: 32px; text-align: center;">
                <a href="https://allio.life/plan" style="display: inline-block; background-color: #4A9B6E; color: #FFFFFF; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                  View full plan
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9C9589;">
                <a href="https://allio.life" style="color: #4A9B6E; text-decoration: none;">Allio</a> — Dinner, figured out.
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
  
  return html
}