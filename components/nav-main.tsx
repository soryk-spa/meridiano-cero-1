"use client"

import Link from "next/link"
import type { ComponentType } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavIcon = ComponentType<{ className?: string }>

export function NavMain({
  items,
  quickAction,
}: {
  items: {
    title: string
    url: string
    isActive?: boolean
    icon?: NavIcon
  }[]
  quickAction?: {
    title: string
    url: string
    icon: NavIcon
  }
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {quickAction ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={quickAction.title}
                className="min-w-8 bg-brand-orange text-white duration-200 ease-linear hover:bg-brand-orange/90 hover:text-white active:bg-brand-orange/90 active:text-white"
              >
                <Link href={quickAction.url}>
                  <quickAction.icon />
                  <span>{quickAction.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} isActive={item.isActive} asChild>
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
