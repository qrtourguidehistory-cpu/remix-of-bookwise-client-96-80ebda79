import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FavoriteEstablishment {
  id: string;
  business_id: string | null;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select("business_id")
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Get all business_ids
      const ids = new Set<string>();
      (data || []).forEach(f => {
        if (f.business_id) ids.add(f.business_id);
      });
      setFavoriteIds(ids);
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds(new Set());
      return;
    }

    // Initial fetch
    fetchFavorites();

    // Subscribe to realtime changes for favorites
    const channel = supabase
      .channel(`favorites-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "favorites",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Favorites changed:", payload);
          // Refetch favorites when they change
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchFavorites]);

  const addFavorite = async (id: string) => {
    if (!user) return { error: new Error("User not logged in") };

    try {
      // Verify business exists
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      
      if (!bizData) {
        throw new Error("Business not found in database");
      }

      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          business_id: id,
        });

      if (error) throw error;
      
      setFavoriteIds(prev => new Set([...prev, id]));
      return { error: null };
    } catch (err) {
      console.error("Error adding favorite:", err);
      return { error: err as Error };
    }
  };

  const removeFavorite = async (id: string) => {
    if (!user) return { error: new Error("User not logged in") };

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("business_id", id);

      if (error) throw error;
      
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      return { error: null };
    } catch (err) {
      console.error("Error removing favorite:", err);
      return { error: err as Error };
    }
  };

  const toggleFavorite = async (id: string) => {
    if (favoriteIds.has(id)) {
      return removeFavorite(id);
    } else {
      return addFavorite(id);
    }
  };

  const isFavorite = (id: string) => favoriteIds.has(id);

  return {
    favoriteIds,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
