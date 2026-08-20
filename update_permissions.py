import os

files = {
    'src/app/actions/tables.ts': 'canManageTables',
    'src/app/actions/venue-elements.ts': 'canManageTables',
    'src/app/actions/guests.ts': 'canManageGuests'
}

for filepath, permission in files.items():
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'requirePermission' not in content:
        content = content.replace('import { revalidatePath } from "next/cache"', 'import { revalidatePath } from "next/cache"\nimport { requirePermission } from "@/lib/session"')
    
    lines = content.split('\n')
    new_lines = []
    in_function = False
    for line in lines:
        if 'export async function' in line:
            in_function = True
        
        if in_function and 'try {' in line:
            new_lines.append(line)
            new_lines.append(f'    await requirePermission(weddingSlug, "{permission}")')
            in_function = False
        else:
            new_lines.append(line)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
