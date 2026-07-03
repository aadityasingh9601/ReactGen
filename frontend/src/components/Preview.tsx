export default function Preview({ url }: { url: string }) {
  console.log("rendered again!");
  console.log("URL ->",url);
  return (
    <div style={{ height: "100%", width: "100%" }}>
      {url === "" && (
        <div className="bg-white h-full">
          Preview is being generated based on the code
        </div>
      )}
      {url && (
        <iframe
          key={url}
          title="Website Preview"
          src={url}
          height={"100%"}
          width={"100%"}
          allow="cross-origin-isolated"
        />
      )}
    </div>
  );
}
