import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useHouseholdStore, Household, HouseholdMember } from '@/store/householdStore';

const HOUSEHOLD_KEY = 'household';

interface CreateHouseholdData {
  name: string;
}

interface JoinHouseholdData {
  inviteCode: string;
}

export function useHousehold() {
  const { setHousehold, setMembers } = useHouseholdStore();

  return useQuery({
    queryKey: [HOUSEHOLD_KEY],
    queryFn: async () => {
      const response = await api.get<{ household: Household; members: HouseholdMember[] }>(
        '/household',
      );
      setHousehold(response.data.household);
      setMembers(response.data.members);
      return response.data;
    },
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  return useMutation({
    mutationFn: async (data: CreateHouseholdData) => {
      const response = await api.post<Household>('/household', data);
      return response.data;
    },
    onSuccess: (household) => {
      setHousehold(household);
      queryClient.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
    },
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JoinHouseholdData) => {
      const response = await api.post<{ household: Household; members: HouseholdMember[] }>(
        '/household/join',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
    },
  });
}

export function useHouseholdMembers() {
  const members = useHouseholdStore((s) => s.members);
  return members;
}

export function useActiveMember() {
  const { members, activeMemberId, setActiveMember } = useHouseholdStore();
  const activeMember = members.find((m) => m.userId === activeMemberId) ?? null;

  return { activeMember, setActiveMember };
}
