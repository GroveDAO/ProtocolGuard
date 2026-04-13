interface CodeDiffViewerProps {
  diff: string;
}

export default function CodeDiffViewer({ diff }: CodeDiffViewerProps) {
  const lines = diff.split("\n");

  return (
    <div style={{ background: "#1e1e1e", borderRadius: 10, overflow: "hidden", fontFamily: "monospace" }}>
      <div style={{ padding: "0.5rem 1rem", background: "#2d2d2d", color: "#ccc", fontSize: "0.8rem", borderBottom: "1px solid #444" }}>
        Code Diff (unified format)
      </div>
      <div style={{ overflowX: "auto", padding: "0.5rem 0" }}>
        {lines.map((line, i) => {
          let bg = "transparent";
          let color = "#e0e0e0";
          let prefix = " ";

          if (line.startsWith("+++") || line.startsWith("---")) {
            bg = "transparent";
            color = "#888";
          } else if (line.startsWith("@@")) {
            bg = "#003344";
            color = "#5bc8db";
            prefix = "";
          } else if (line.startsWith("+")) {
            bg = "#0d3620";
            color = "#85e89d";
          } else if (line.startsWith("-")) {
            bg = "#3d0c0c";
            color = "#f97583";
          }

          return (
            <div
              key={i}
              style={{
                display: "flex",
                background: bg,
                paddingLeft: "0.5rem",
                paddingRight: "1rem",
              }}
            >
              <span style={{ color: "#555", minWidth: "2.5rem", userSelect: "none", textAlign: "right", paddingRight: "1rem" }}>
                {i + 1}
              </span>
              <span style={{ color, whiteSpace: "pre", flex: 1 }}>{line || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
