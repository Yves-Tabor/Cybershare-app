const RESOURCE_FEED = [
  {
    type: "Guide",
    title: "OWASP Top 10 — 2025 Edition",
    desc: "A complete walkthrough of this year's most critical web application risks, with annotated code examples for each category.",
    author: "Cybershare Team",
    time: "3h ago",
    tag: "Web Security",
  },
  {
    type: "Write-up",
    title: "Bypassing Rate Limits with Header Smuggling",
    desc: "A researcher breaks down a real-world disclosure showing how inconsistent proxy parsing let attackers slip past rate limiters entirely.",
    author: "0xRaven",
    time: "7h ago",
    tag: "API Security",
  },
  {
    type: "Tool",
    title: "Nuclei Template Pack — Auth Testing",
    desc: "240 community-built detection templates covering broken authentication, session fixation, and JWT misconfigurations.",
    author: "sec_phantom",
    time: "1d ago",
    tag: "Tooling",
  },
  {
    type: "Advisory",
    title: "Critical RCE in a Popular CMS Plugin",
    desc: "Unauthenticated remote code execution affecting installs prior to v4.2.1. Patch details and indicators of compromise inside.",
    author: "Cybershare Team",
    time: "1d ago",
    tag: "Vulnerability",
  },
  {
    type: "Video",
    title: "Reading a Burp Suite Trace Like a Pro",
    desc: "A 30-minute walkthrough on spotting injection points, replaying requests, and building intuition for where bugs hide.",
    author: "h4ckl1ght",
    time: "2d ago",
    tag: "Tutorial",
  },
];

const TYPE_COLOR = {
  Guide: "#f59e0b",
  "Write-up": "#a78bfa",
  Tool: "#34d399",
  Advisory: "#f87171",
  Video: "#60a5fa",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#e0e0e0]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <main className="px-5 sm:px-8 py-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[22px] sm:text-[26px] text-white tracking-tight" style={{ fontFamily: "'Chelsea Market', cursive" }}>
            Latest from the community
          </h1>
          <p className="text-[13px] text-[#888] mt-1">
            Fresh write-ups, guides, and advisories from security researchers.
          </p>
        </div>
          <div className="bg-red-500 text-white p-8 text-2xl font-bold">
            Tailwind is working!
          </div>
        <div className="flex flex-col gap-3">
          {RESOURCE_FEED.map((post, i) => (
            <article
              key={i}
              className="rounded-2xl border border-[#222] bg-[#111] hover:border-[#f59e0b]/30 transition-colors p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    color: TYPE_COLOR[post.type],
                    background: TYPE_COLOR[post.type] + "1a",
                  }}
                >
                  {post.type}
                </span>
                <span className="text-[10px] text-[#555]">{post.tag}</span>
              </div>

              <h2 className="text-[15px] sm:text-[16px] font-semibold text-white leading-snug mb-1.5">
                {post.title}
              </h2>
              <p className="text-[12.5px] text-[#888] leading-relaxed mb-3">
                {post.desc}
              </p>

              <div className="flex items-center justify-between text-[11px] text-[#555]">
                <span>{post.author}</span>
                <span>{post.time}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}