import React from "react";
import { StatusBar } from "expo-status-bar";
import TransitTracker from "./src/components/TransitTracker";

export default function App() {
  return (
    <>
      <TransitTracker />
      <StatusBar style="auto" />
    </>
  );
}
