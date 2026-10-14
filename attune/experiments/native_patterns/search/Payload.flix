/// Lossless compression of complete rankings; this owns no ranking semantics.
pub mod Payload {
    use Attune.Artifacts
    use Util.Json
    use Util.Json.{FromJson,ToJson}
    import java.util.Base64
    import java.util.zip.{GZIPInputStream,GZIPOutputStream}
    import java.io.{ByteArrayInputStream,ByteArrayOutputStream}
    import java.nio.charset.StandardCharsets
    import java.lang.{String => JavaString}
    pub def write(text: String): Unit \ IO = {
        let buffer=new ByteArrayOutputStream();
        let stream=new GZIPOutputStream(buffer);
        stream.write(text.getBytes(StandardCharsets.UTF_8));
        stream.close();
        Artifacts.write(Json.toCompactString(ToJson.toJson(("gzip-base64-v1",Campaign.sha(text),Base64.getEncoder().encodeToString(buffer.toByteArray())))))
    }
    pub def input(name: String): a \ IO with FromJson.FromJson[a] = {
        let raw=Artifacts.input(name);
        let wire: Result[Util.Json.JsonError.JsonError,(String,String,String)]=Json.decode(raw);
        let text=match wire {
            case Ok(("gzip-base64-v1",digest,encoded)) => {
                let stream=new GZIPInputStream(new ByteArrayInputStream(Base64.getDecoder().decode(encoded)));
                let bytes=stream.readAllBytes();stream.close();
                let text=new JavaString(bytes,StandardCharsets.UTF_8);
                Artifacts.required(if(Campaign.sha(text) == digest)Ok(text)else Err("Corrupt sealed prediction payload."))
            }
            case _ => raw
        };
        Artifacts.required(Result.mapErr(_ -> "Malformed deterministic payload.",Json.decode(text)))
    }
}
