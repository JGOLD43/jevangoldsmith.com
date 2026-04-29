function createDetailPageEngine({
  adventureForFile,
  renderAdventurePage,
  skillForFile,
  renderSkillPage
}) {
  return {
    render({ file, entry }) {
      if (entry.engineView === 'adventure') {
        const adventure = adventureForFile(file);
        return adventure ? renderAdventurePage(file, adventure) : null;
      }

      if (entry.engineView === 'skill') {
        const skill = skillForFile(file);
        return skill ? renderSkillPage(file, skill) : null;
      }

      return null;
    }
  };
}

module.exports = {
  createDetailPageEngine
};
