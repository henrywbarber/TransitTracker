import React, { useContext } from "react";
import { ScrollView, Text } from "react-native";

import TransitTrainCard from "../TransitTrainCard";
import TransitBusCard from "../TransitBusCard";
import { FavoriteBussesContext, FavoriteTrainsContext } from "../../FavoritesContext";

function TransitHomeScreen() {
    const [favoriteTrains] = useContext(FavoriteTrainsContext);
    const [favoriteBusses] = useContext(FavoriteBussesContext);

    return (
        <ScrollView contentContainerStyle={{ padding: 10 }}>
            {favoriteTrains.length > 0 || favoriteBusses.length > 0 ? (
                <>
                    {favoriteTrains.map(train => (
                        <TransitTrainCard key={train.id} train={train} />
                    ))}
                    {favoriteBusses.map(bus => (
                        <TransitBusCard key={bus.id} bus={bus} />
                    ))}
                </>
            ) : (
                <Text style={{ fontSize: 28, textAlign: "center", padding: 15 }}>
                    No favorite trains or buses to display.
                </Text>
            )}
        </ScrollView>
    );
}

export default TransitHomeScreen;
