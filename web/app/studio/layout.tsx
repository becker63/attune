import { StudioSession } from "./session";
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudioSession>{children}</StudioSession>;
}
