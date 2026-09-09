import NextAuth from "next-auth"
import { NextAuthConfig } from "next-auth"

const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const isApiAuthRoute = pathname.startsWith('/api/auth')
  const isNextStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')
  // Rotas públicas: autenticação + site público do casamento (RSVP, presentes, mural)
  // (auto-cadastro /register desativado — contas criadas pela equipe)
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/site')

  if (isNextStatic || isApiAuthRoute) {
    return
  }

  if (isPublicRoute) {
    // Usuário logado tentando acessar o login vai para a home (que redireciona por role)
    if (isLoggedIn && pathname.startsWith('/login')) {
      return Response.redirect(new URL('/', req.nextUrl))
    }
    return
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
