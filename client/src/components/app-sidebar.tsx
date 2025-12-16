import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  Receipt,
  FileText,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "POS", url: "/pos", icon: ShoppingCart },
];

const inventoryNavItems = [
  { title: "Products", url: "/products", icon: Package },
  { title: "Inventory", url: "/inventory", icon: Package },
];

const salesNavItems = [
  { title: "Sales", url: "/sales", icon: Receipt },
  { title: "Customers", url: "/customers", icon: Users },
];

const purchaseNavItems = [
  { title: "Purchases", url: "/purchases", icon: FileText },
  { title: "Suppliers", url: "/suppliers", icon: Truck },
];

const financeNavItems = [
  { title: "Cash Register", url: "/cash-register", icon: CreditCard },
  { title: "Payments", url: "/payments", icon: Wallet },
  { title: "Expenses", url: "/expenses", icon: DollarSign },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const adminNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

interface NavGroupProps {
  label: string;
  items: { title: string; url: string; icon: React.ElementType }[];
}

function NavGroup({ label, items }: NavGroupProps) {
  const [location] = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-3">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "transition-colors",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { user, logout, can } = useAuth();
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Filter nav items based on permissions
  const filteredMainNav = mainNavItems.filter(item => {
    if (item.url === "/") return can("dashboard:read");
    return true;
  });

  const filteredFinanceNav = financeNavItems.filter(item => {
    if (item.url === "/cash-register") return can("cash_register:read");
    if (item.url === "/reports") return can("reports:read");
    return true;
  });

  const filteredAdminNav = adminNavItems.filter(item => {
    if (item.url === "/settings") return can("settings:read");
    return true;
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base">SMS</span>
            <span className="text-xs text-muted-foreground">Management System</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {filteredMainNav.length > 0 && <NavGroup label="Main" items={filteredMainNav} />}
        <NavGroup label="Inventory" items={inventoryNavItems} />
        <NavGroup label="Sales" items={salesNavItems} />
        <NavGroup label="Purchases" items={purchaseNavItems} />
        {filteredFinanceNav.length > 0 && <NavGroup label="Finance" items={filteredFinanceNav} />}
        {filteredAdminNav.length > 0 && <NavGroup label="Admin" items={filteredAdminNav} />}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
              {user ? getInitials(user.displayName) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{user?.displayName || "User"}</span>
            <Badge variant="secondary" className="w-fit text-xs px-1.5 py-0">
              {user?.role || "User"}
            </Badge>
          </div>
          <button 
            className="p-2 rounded-md text-muted-foreground hover-elevate active-elevate-2"
            data-testid="button-logout"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
