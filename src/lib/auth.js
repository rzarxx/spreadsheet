import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets",
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        try {
          // Upsert user in our database
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              picture: user.image,
              accessToken: account.access_token,
              // Only update refresh token if it's provided (it's only provided on first consent)
              ...(account.refresh_token && { refreshToken: account.refresh_token }),
            },
            create: {
              email: user.email,
              name: user.name,
              picture: user.image,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
            },
          });
          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      return false;
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        // Add db user id to session
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
