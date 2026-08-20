import os
import shutil

# 1. Fix src/lib/session.ts
path_session = 'src/lib/session.ts'
if os.path.exists(path_session):
    with open(path_session, 'r', encoding='utf-8') as f:
        session_content = f.read()
    if 'name?: string' not in session_content:
        session_content = session_content.replace('email: string;', 'email: string;\n  name?: string;')
        session_content = session_content.replace('email: session.user.email || "",', 'email: session.user.email || "",\n    name: session.user.name || undefined,')
    with open(path_session, 'w', encoding='utf-8') as f:
        f.write(session_content)

# 2. Fix src/app/actions/guests.ts
path_guests = 'src/app/actions/guests.ts'
if os.path.exists(path_guests):
    with open(path_guests, 'r', encoding='utf-8') as f:
        guests_content = f.read()
    guests_content = guests_content.replace('requirePermission(weddingSlug,', 'requirePermission(weddingId,')
    with open(path_guests, 'w', encoding='utf-8') as f:
        f.write(guests_content)

# 3. Fix Button asChild everywhere
# src/app/(planner)/planner/weddings/page.tsx
p1 = 'src/app/(planner)/planner/weddings/page.tsx'
if os.path.exists(p1):
    with open(p1, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('<Button asChild className="w-full gap-2 group-hover:bg-primary" variant="outline">\n                  <Link href={`/${wedding.slug}/dashboard`}>\n                    Acessar Painel\n                    <ExternalLink className="w-4 h-4" />\n                  </Link>\n                </Button>', '<Link href={`/${wedding.slug}/dashboard`}>\n                  <Button className="w-full gap-2 group-hover:bg-primary" variant="outline">\n                    Acessar Painel\n                    <ExternalLink className="w-4 h-4" />\n                  </Button>\n                </Link>')
    with open(p1, 'w', encoding='utf-8') as f:
        f.write(c)

# src/components/layout/admin-sidebar.tsx
p2 = 'src/components/layout/admin-sidebar.tsx'
if os.path.exists(p2):
    with open(p2, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('<SidebarMenuButton asChild', '<SidebarMenuButton')
    with open(p2, 'w', encoding='utf-8') as f:
        f.write(c)

# src/components/tables/mesas-client.tsx
p3 = 'src/components/tables/mesas-client.tsx'
if os.path.exists(p3):
    with open(p3, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('<Button asChild', '<Button')
    with open(p3, 'w', encoding='utf-8') as f:
        f.write(c)

# 4. Fix src/lib/auth.ts
path_auth = 'src/lib/auth.ts'
if os.path.exists(path_auth):
    with open(path_auth, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('user.role', '(user as any).role')
    with open(path_auth, 'w', encoding='utf-8') as f:
        f.write(c)

# 5. Move middleware.ts to proxy.ts
if os.path.exists('src/middleware.ts'):
    shutil.move('src/middleware.ts', 'src/proxy.ts')

print('fixes applied')
