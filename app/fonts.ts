import { Montserrat } from "next/font/google"
import localFont from "next/font/local"

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
})

export const monumentExtended = localFont({
  src: "./fonts/MonumentExtended-Regular.otf",
  display: "swap",
  variable: "--font-monument",
})
