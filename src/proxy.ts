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
  const isOnAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register')
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isNextStatic = req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.startsWith('/favicon.ico')

  if (isNextStatic || isApiAuthRoute) {
    return
  }

  if (isOnAuthPage) {
    if (isLoggedIn) {
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
