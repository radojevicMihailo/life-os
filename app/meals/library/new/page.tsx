import { FoodForm } from "../../_components/FoodForm";

export default function NewFoodPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">New food</h1>
      <FoodForm
        mode={{ kind: "create" }}
        initial={{
          name: "",
          brand: "",
          kcalPer100g: "",
          proteinPer100g: "",
          carbsPer100g: "",
          fatPer100g: "",
        }}
      />
    </div>
  );
}
