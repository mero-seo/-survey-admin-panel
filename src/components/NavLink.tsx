"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";

interface NavLinkProps {
    href: string;
    label: string;
    icon: React.ElementType;
    collapsed: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({ href, label, icon: Icon, collapsed }) => {
    const searchParams = useSearchParams();
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    const newHref = new URL(href, "http://dummybase.com");

    if (page) {
        newHref.searchParams.set('page', page);
    }
    if (limit) {
        newHref.searchParams.set('limit', limit);
    }
    
    const finalHref = `${newHref.pathname}${newHref.search}`;

    return (
        <Link
            href={finalHref}
            className={`flex items-center px-3 py-2 rounded hover:bg-muted text-base font-medium transition-all duration-200 gap-3 ${
            collapsed ? "justify-center" : ""
            }`}
            aria-label={collapsed ? label : undefined}
        >
            <Icon size={20} />
            {!collapsed && label}
        </Link>
    );
}; 