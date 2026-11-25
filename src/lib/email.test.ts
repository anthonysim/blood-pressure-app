import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { passwordResetEmail, sendEmail } = await import("./email");

const email = { to: "a@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("passwordResetEmail", () => {
  it("includes the link and escapes the name", () => {
    const msg = passwordResetEmail({ name: "<b>Ann</b>", url: "https://x.test/r?token=a&b=1" });
    expect(msg.text).toContain("https://x.test/r?token=a&b=1");
    expect(msg.html).toContain('href="https://x.test/r?token=a&#38;b=1"');
    expect(msg.html).not.toContain("<b>Ann</b>");
    expect(msg.html).toContain("&#60;b&#62;Ann");
  });
});

describe("sendEmail", () => {
  it("logs instead of sending in development without a key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail(email);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws in production without a key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(sendEmail(email)).rejects.toThrow("RESEND_API_KEY");
  });

  it("posts to Resend and surfaces API errors", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "App <no-reply@x.test>");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Domain not verified" }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail(email);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ from: "App <no-reply@x.test>", to: ["a@example.com"], subject: "Hi" });

    await expect(sendEmail(email)).rejects.toThrow("Resend 403: Domain not verified");
  });
});
