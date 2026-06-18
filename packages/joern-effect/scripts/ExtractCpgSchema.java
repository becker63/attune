import io.shiftleft.codepropertygraph.generated.GraphSchema;
import io.shiftleft.codepropertygraph.generated.Properties;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;
import scala.collection.Iterator;
import scala.collection.immutable.Set;

public final class ExtractCpgSchema {
  private static String json(String value) {
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }

  private static String cardinality(String quantity) {
    String lower = quantity.toLowerCase();
    if (lower.contains("zeroorone")) return "zeroOrOne";
    if (lower.contains("list") || lower.contains("zeroormore")) return "zeroOrMore";
    return "one";
  }

  private static String valueType(String type) {
    String lower = type.toLowerCase();
    if (lower.contains("string")) return "string";
    if (lower.contains("boolean")) return "boolean";
    if (lower.contains("int")
        || lower.contains("long")
        || lower.contains("short")
        || lower.contains("float")
        || lower.contains("double")) return "number";
    return "unknown";
  }

  private static String cpgName(String methodName) {
    return methodName.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toUpperCase();
  }

  private static Map<String, Method> propertyMethods() {
    Map<String, Method> result = new HashMap<>();
    for (Method method : Properties.class.getMethods()) {
      if (method.getParameterCount() == 0) {
        result.put(cpgName(method.getName()), method);
      }
    }
    return result;
  }

  public static void main(String[] args) {
    Map<String, Method> methods = propertyMethods();
    String version = args.length == 0 ? "unknown" : args[0];

    System.out.println("{");
    System.out.println("  \"version\": \"joern-codepropertygraph-" + version + "\",");
    System.out.println("  \"nodes\": [");

    Iterator<String> labels = GraphSchema.nodeLabels().iterator();
    boolean firstNode = true;
    while (labels.hasNext()) {
      String label = labels.next();
      int nodeKind = GraphSchema.getNodeKindByLabel(label);
      Set<String> names = GraphSchema.getNodePropertyNames(label);
      Iterator<String> props = names.iterator();

      if (!firstNode) System.out.println(",");
      firstNode = false;
      System.out.println("    { \"name\": " + json(label) + ", \"properties\": [");

      boolean firstProp = true;
      while (props.hasNext()) {
        String prop = props.next();
        int propKind = GraphSchema.getPropertyKindByName(prop);
        Method method = methods.get(prop);
        String keyClass = method == null ? "" : method.getReturnType().getName();
        Type genericType = method == null ? null : method.getGenericReturnType();
        String quantity =
            keyClass.contains("OptionalPropertyKey")
                ? "zeroOrOne"
                : keyClass.contains("MultiPropertyKey")
                    ? "zeroOrMore"
                    : GraphSchema.getNodePropertyFormalQuantity(nodeKind, propKind).toString();
        String formalType = GraphSchema.getNodePropertyFormalType(nodeKind, propKind).toString();
        String generic = genericType == null ? "" : genericType.toString();
        String type = generic.contains("java.lang.Object") || generic.isEmpty() ? formalType : generic;

        if (!firstProp) System.out.println(",");
        firstProp = false;
        System.out.print(
            "      { \"name\": "
                + json(prop)
                + ", \"valueType\": "
                + json(valueType(type))
                + ", \"cardinality\": "
                + json(cardinality(quantity))
                + ", \"nullable\": "
                + (cardinality(quantity).equals("zeroOrOne") ? "true" : "false")
                + " }");
      }

      System.out.println();
      System.out.print("    ] }");
    }

    System.out.println();
    System.out.println("  ],");
    System.out.println("  \"edges\": [");

    String[] edges = GraphSchema.edgeLabels();
    for (int i = 0; i < edges.length; i++) {
      if (i > 0) System.out.println(",");
      System.out.print("    { \"label\": " + json(edges[i]) + " }");
    }

    System.out.println();
    System.out.println("  ]");
    System.out.println("}");
  }
}
